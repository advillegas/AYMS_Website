"use client";

/**
 * Roles + user-role membership, synced to Firestore in realtime.
 *
 * Data lives in two Firestore documents:
 *   config/roles      → { roles: Role[] }
 *   config/userRoles   → { map: Record<string, string[]> }
 *
 * The Zustand store is the local cache; onSnapshot keeps it in sync
 * across every browser and device. Mutations write to Firestore first,
 * and the snapshot listener propagates the change back into the store.
 *
 * Falls back to localStorage-only when Firestore isn't configured so
 * the site still works during local development.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  DEFAULT_ROLES,
  DEFAULT_USER_ROLES,
  type Role,
  type PermissionKey,
  resolveRoles,
  hasPermission as hasPermissionPure,
  nameColor as nameColorPure,
} from "./roles";
import { useAuth } from "./store";
import { useEffect, useMemo } from "react";
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";

/* ------------------------------------------------------------------ */
/* Store shape (unchanged from the localStorage era so all 16+         */
/* consumers keep working without import changes)                      */
/* ------------------------------------------------------------------ */

interface RolesState {
  roles: Role[];
  userRoles: Record<string, string[]>;
  seededRolesAt: number | null;
  seededMembershipAt: number | null;
  /** True once the Firestore listener has delivered its first snapshot. */
  _synced: boolean;

  createRole: (role: Omit<Role, "id"> & { id?: string }) => Role;
  updateRole: (id: string, patch: Partial<Role>) => void;
  deleteRole: (id: string) => boolean;
  setUserRoles: (userId: string, roleIds: string[]) => void;
  toggleUserRole: (userId: string, roleId: string) => void;
  reseedDefaults: () => void;
}

function generateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `role-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `role-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/* ------------------------------------------------------------------ */
/* Firestore persistence helpers                                       */
/* ------------------------------------------------------------------ */

async function writeRolesToFirestore(roles: Role[]): Promise<void> {
  if (!isFirebaseConfigured) return;
  const db = getDb();
  if (!db) return;
  try {
    await setDoc(doc(db, "config", "roles"), { roles }, { merge: false });
  } catch (err) {
    console.warn("[roles] Firestore write failed", err);
  }
}

async function writeUserRolesToFirestore(
  map: Record<string, string[]>,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  const db = getDb();
  if (!db) return;
  try {
    await setDoc(doc(db, "config", "userRoles"), { map }, { merge: false });
  } catch (err) {
    console.warn("[userRoles] Firestore write failed", err);
  }
}

async function seedFirestoreIfEmpty(): Promise<void> {
  if (!isFirebaseConfigured) return;
  const db = getDb();
  if (!db) return;
  try {
    const snap = await getDoc(doc(db, "config", "roles"));
    if (!snap.exists()) {
      await setDoc(doc(db, "config", "roles"), { roles: DEFAULT_ROLES });
      await setDoc(doc(db, "config", "userRoles"), { map: DEFAULT_USER_ROLES });
      console.debug("[roles] seeded Firestore with defaults");
    }
  } catch (err) {
    console.warn("[roles] seed check failed", err);
  }
}

/* ------------------------------------------------------------------ */
/* Zustand store                                                       */
/* ------------------------------------------------------------------ */

export const useRoles = create<RolesState>()(
  persist(
    (set, get) => ({
      roles: DEFAULT_ROLES,
      userRoles: DEFAULT_USER_ROLES,
      seededRolesAt: Date.now(),
      seededMembershipAt: Date.now(),
      _synced: false,

      createRole: (role) => {
        const next: Role = {
          id: role.id ?? generateId(),
          name: role.name,
          color: role.color,
          priority: role.priority,
          permissions: role.permissions ?? [],
          system: false,
        };
        set((s) => {
          const updated = [...s.roles, next];
          void writeRolesToFirestore(updated);
          return { roles: updated };
        });
        return next;
      },

      updateRole: (id, patch) => {
        set((s) => {
          const updated = s.roles.map((r) =>
            r.id === id ? { ...r, ...patch, system: r.system } : r,
          );
          void writeRolesToFirestore(updated);
          return { roles: updated };
        });
      },

      deleteRole: (id) => {
        const target = get().roles.find((r) => r.id === id);
        if (!target || target.system) return false;
        set((s) => {
          const updatedRoles = s.roles.filter((r) => r.id !== id);
          const updatedUserRoles = Object.fromEntries(
            Object.entries(s.userRoles).map(([uid, rids]) => [
              uid,
              rids.filter((rid) => rid !== id),
            ]),
          );
          void writeRolesToFirestore(updatedRoles);
          void writeUserRolesToFirestore(updatedUserRoles);
          return { roles: updatedRoles, userRoles: updatedUserRoles };
        });
        return true;
      },

      setUserRoles: (userId, roleIds) => {
        set((s) => {
          const updated = { ...s.userRoles, [userId]: roleIds };
          void writeUserRolesToFirestore(updated);
          return { userRoles: updated };
        });
      },

      toggleUserRole: (userId, roleId) => {
        // Protection: the server admin account ("admin") can never
        // lose the admin role. This ensures the original admin
        // always retains full control of the space.
        if (userId === "admin" && roleId === "role-admin") {
          const current = get().userRoles[userId] ?? [];
          if (current.includes("role-admin")) return; // block removal
        }
        set((s) => {
          const current = s.userRoles[userId] ?? [];
          const next = current.includes(roleId)
            ? current.filter((r) => r !== roleId)
            : [...current, roleId];
          const updated = { ...s.userRoles, [userId]: next };
          void writeUserRolesToFirestore(updated);
          return { userRoles: updated };
        });
      },

      reseedDefaults: () => {
        set((s) => {
          const byId = new Map(s.roles.map((r) => [r.id, r]));
          for (const def of DEFAULT_ROLES) {
            byId.set(def.id, def);
          }
          const updated = Array.from(byId.values());
          void writeRolesToFirestore(updated);
          return { roles: updated, seededRolesAt: Date.now() };
        });
      },
    }),
    {
      name: "ayms-roles",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // localStorage stays as a fallback cache for offline / non-Firebase
    },
  ),
);

/* ------------------------------------------------------------------ */
/* Firestore realtime listener (mounted once via useRolesSync)         */
/* ------------------------------------------------------------------ */

let listenerStarted = false;

export function useRolesSync(): void {
  useEffect(() => {
    if (!isFirebaseConfigured || listenerStarted) return;
    listenerStarted = true;
    const db = getDb();
    if (!db) return;

    void seedFirestoreIfEmpty();

    const unsubRoles = onSnapshot(
      doc(db, "config", "roles"),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as { roles?: Role[] };
        if (data.roles) {
          useRoles.setState({ roles: data.roles, _synced: true });
        }
      },
      (err) => console.warn("[roles] snapshot failed", err),
    );

    const unsubUserRoles = onSnapshot(
      doc(db, "config", "userRoles"),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as { map?: Record<string, string[]> };
        if (data.map) {
          useRoles.setState({ userRoles: data.map });
        }
      },
      (err) => console.warn("[userRoles] snapshot failed", err),
    );

    return () => {
      unsubRoles();
      unsubUserRoles();
      listenerStarted = false;
    };
  }, []);
}

/* ------------------------------------------------------------------ */
/* Derived hooks (unchanged API)                                       */
/* ------------------------------------------------------------------ */

export function useUserRoles(userId: string | null | undefined): Role[] {
  const allRoles = useRoles((s) => s.roles);
  const userRoles = useRoles((s) => s.userRoles);
  const currentUser = useAuth((s) => s.user);
  const registry = useAuth((s) => s.registry);
  return useMemo(() => {
    if (!userId) return [];
    const stored = userRoles[userId];
    if (stored && stored.length > 0) {
      return resolveRoles(allRoles, stored);
    }
    let legacyRole: string | undefined;
    if (currentUser?.id === userId) {
      legacyRole = currentUser.role;
    } else {
      const reg = registry.find((r) => r.id === userId);
      if (reg) legacyRole = reg.role;
    }
    if (!legacyRole) return [];
    const fallbackId =
      legacyRole === "admin"
        ? "role-admin"
        : legacyRole === "leader"
          ? "role-leader"
          : legacyRole === "amiga"
            ? "role-amiga"
            : null;
    if (!fallbackId) return [];
    return resolveRoles(allRoles, [fallbackId]);
  }, [allRoles, userRoles, userId, currentUser, registry]);
}

export function useHasPermission(
  perm: PermissionKey,
  userId?: string,
): boolean {
  const currentUser = useAuth((s) => s.user);
  const targetId = userId ?? currentUser?.id;
  const roles = useUserRoles(targetId);
  return useMemo(() => hasPermissionPure(roles, perm), [roles, perm]);
}

export function useNameColor(userId: string | null | undefined): string | undefined {
  const roles = useUserRoles(userId);
  return nameColorPure(roles);
}

export function useMe() {
  const user = useAuth((s) => s.user);
  const roles = useUserRoles(user?.id);
  return useMemo(
    () => ({
      user,
      roles,
      hasPermission: (perm: PermissionKey) => hasPermissionPure(roles, perm),
      nameColor: nameColorPure(roles),
    }),
    [user, roles],
  );
}
