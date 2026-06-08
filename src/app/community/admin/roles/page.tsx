"use client";

import { useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Plus,
  Trash2,
  Save,
  Lock,
  Users,
  Search,
  X as XIcon,
  UserPlus,
} from "lucide-react";
import { useRoles, useHasPermission } from "@/lib/use-roles-store";
import { useCommunity, useAuth } from "@/lib/store";
import {
  ALL_PERMISSIONS,
  ROLE_COLOR_PRESETS,
  type PermissionDef,
  type PermissionKey,
  type Role,
} from "@/lib/roles";
import { toast } from "sonner";
import { cn, initials } from "@/lib/utils";

const PERMISSION_GROUPS: Record<PermissionDef["category"], string> = {
  general: "General",
  messages: "Messages & content",
  moderation: "Moderation",
  voice: "Voice & video",
  admin: "Admin",
};

export default function RolesAdminPage() {
  const roles = useRoles((s) => s.roles);
  const userRoles = useRoles((s) => s.userRoles);
  const createRole = useRoles((s) => s.createRole);
  const updateRole = useRoles((s) => s.updateRole);
  const deleteRole = useRoles((s) => s.deleteRole);
  const toggleUserRole = useRoles((s) => s.toggleUserRole);
  const canManage = useHasPermission("manageRoles");

  const members = useCommunity((s) => s.members);
  const registry = useAuth((s) => s.registry);
  const currentUser = useAuth((s) => s.user);

  // Combined member list (admin + mock + registered users) for the
  // "assign members" panel.
  const allUsers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; avatar: string }>();
    for (const m of members) map.set(m.id, m);
    for (const r of registry) {
      if (!map.has(r.id))
        map.set(r.id, { id: r.id, name: r.name, avatar: r.avatar });
    }
    if (currentUser && !map.has(currentUser.id)) {
      map.set(currentUser.id, {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
      });
    }
    return Array.from(map.values());
  }, [members, registry, currentUser]);

  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => b.priority - a.priority),
    [roles],
  );

  // Per-role member count, derived once from the userRoles map so we
  // can show "Moderator . 7" Discord-style next to each role row.
  const memberCountByRole = useMemo(() => {
    const out: Record<string, number> = {};
    for (const ids of Object.values(userRoles)) {
      for (const id of ids) out[id] = (out[id] ?? 0) + 1;
    }
    return out;
  }, [userRoles]);

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(
    sortedRoles[0]?.id ?? null,
  );
  const role = roles.find((r) => r.id === selectedRoleId) ?? null;

  function handleCreate() {
    const next = createRole({
      name: "New role",
      color: ROLE_COLOR_PRESETS[Math.floor(Math.random() * ROLE_COLOR_PRESETS.length)],
      priority: 20,
      permissions: ["viewChannels", "sendMessages", "addReactions", "createThreads"],
    });
    setSelectedRoleId(next.id);
    toast.success("Role created");
  }

  function handleDelete() {
    if (!role) return;
    if (role.system) {
      toast.error("System roles can't be deleted.");
      return;
    }
    const ok = deleteRole(role.id);
    if (ok) {
      toast.success(`Deleted "${role.name}"`);
      setSelectedRoleId(sortedRoles.find((r) => r.id !== role.id)?.id ?? null);
    }
  }

  if (!canManage) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <Lock className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-semibold">Roles are locked</p>
          <p className="mt-1 text-xs text-muted-foreground">
            You need the{" "}
            <span className="font-medium text-foreground">Manage Roles</span>{" "}
            permission to edit roles and assignments.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 overflow-auto h-full">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 font-[family-name:var(--font-heading)]">
              <Shield className="h-6 w-6 text-primary" />
              Roles &amp; Permissions
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Define roles, set their colors, configure permissions, and
              assign members.
            </p>
          </div>
          <Button onClick={handleCreate} className="bg-primary hover:bg-magenta">
            <Plus className="h-4 w-4 mr-1.5" /> New role
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          {/* Role list */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Roles
              </h3>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-0.5">
                {sortedRoles.map((r) => {
                  const count = memberCountByRole[r.id] ?? 0;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRoleId(r.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                        selectedRoleId === r.id
                          ? "bg-primary/15 text-primary font-semibold"
                          : "hover:bg-primary/5 text-foreground/85",
                      )}
                    >
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: r.color }}
                      />
                      <span className="truncate flex-1">{r.name}</span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 text-[10px] tabular-nums",
                          selectedRoleId === r.id
                            ? "text-primary/80"
                            : "text-muted-foreground",
                        )}
                        title={`${count} member${count === 1 ? "" : "s"}`}
                      >
                        <Users className="h-3 w-3" />
                        {count}
                      </span>
                      {r.system && (
                        <Lock
                          className="h-3 w-3 text-muted-foreground"
                          aria-label="System role"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Editor */}
          <div className="space-y-4 min-w-0">
            {!role ? (
              <Card>
                <CardContent className="p-12 text-center text-sm text-muted-foreground">
                  Pick a role from the list to edit it, or create a new one.
                </CardContent>
              </Card>
            ) : (
              <>
                <RoleEditor
                  role={role}
                  onChange={(patch) => updateRole(role.id, patch)}
                  onDelete={handleDelete}
                />

                <RoleMembersCard
                  role={role}
                  allUsers={allUsers}
                  userRoles={userRoles}
                  onToggle={(uid) => toggleUserRole(uid, role.id)}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Members panel                                                       */
/* ------------------------------------------------------------------ */

interface RoleMembersCardProps {
  role: Role;
  allUsers: { id: string; name: string; avatar: string }[];
  userRoles: Record<string, string[]>;
  onToggle: (userId: string) => void;
}

/**
 * Discord-style member list for a role: the people currently in the
 * role at the top, an inline search to add anyone else underneath.
 *
 * Pulled into its own component so the search query is local state
 * and doesn't reset on every parent re-render.
 */
function RoleMembersCard({
  role,
  allUsers,
  userRoles,
  onToggle,
}: RoleMembersCardProps) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);

  const inRole = useMemo(
    () =>
      allUsers
        .filter((u) => (userRoles[u.id] ?? []).includes(role.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allUsers, userRoles, role.id],
  );
  const notInRole = useMemo(
    () =>
      allUsers.filter((u) => !(userRoles[u.id] ?? []).includes(role.id)),
    [allUsers, userRoles, role.id],
  );

  const q = search.trim().toLowerCase();
  const filteredCandidates = useMemo(() => {
    if (!q) return notInRole.slice(0, 50);
    return notInRole
      .filter((u) => u.name.toLowerCase().includes(q))
      .slice(0, 50);
  }, [notInRole, q]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            Members &mdash; {inRole.length}
          </h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Everyone currently assigned the
            <span
              className="mx-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{
                color: role.color,
                backgroundColor: `${role.color}1A`,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: role.color }}
              />
              {role.name}
            </span>
            role.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant={adding ? "secondary" : "default"}
          onClick={() => {
            setAdding((v) => !v);
            if (!adding) setSearch("");
          }}
          className={cn(
            !adding && "bg-primary hover:bg-magenta",
          )}
        >
          {adding ? (
            <>
              <XIcon className="mr-1 h-3.5 w-3.5" /> Done
            </>
          ) : (
            <>
              <UserPlus className="mr-1 h-3.5 w-3.5" /> Add members
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {inRole.length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-1 py-2">
            No one has this role yet. Click <strong>Add members</strong> above
            to assign the first.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 max-h-72 overflow-y-auto">
            {inRole.map((u) => (
              <div
                key={u.id}
                className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-primary/5"
              >
                <Avatar className="h-6 w-6">
                  {u.avatar && (
                    <AvatarImage src={u.avatar} alt={u.name} />
                  )}
                  <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary/20 to-rosa/40 text-primary font-semibold">
                    {initials(u.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm truncate flex-1">{u.name}</span>
                <button
                  type="button"
                  onClick={() => onToggle(u.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Remove ${u.name}`}
                  title={`Remove ${u.name}`}
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {adding && (
          <div className="rounded-lg border border-rosa/20 bg-muted/30 p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search members to add..."
                className="pl-8 h-8 text-xs"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 max-h-60 overflow-y-auto">
              {filteredCandidates.length === 0 ? (
                <p className="text-xs text-muted-foreground italic col-span-full px-1 py-2">
                  {q ? "No matches." : "Everyone is already in this role."}
                </p>
              ) : (
                filteredCandidates.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => onToggle(u.id)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-primary/5 text-left"
                  >
                    <Avatar className="h-6 w-6">
                      {u.avatar && (
                        <AvatarImage src={u.avatar} alt={u.name} />
                      )}
                      <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary/20 to-rosa/40 text-primary font-semibold">
                        {initials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate flex-1">{u.name}</span>
                    <Plus className="h-3.5 w-3.5 text-primary/60" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface RoleEditorProps {
  role: Role;
  onChange: (patch: Partial<Role>) => void;
  onDelete: () => void;
}

function RoleEditor({ role, onChange, onDelete }: RoleEditorProps) {
  const grouped = useMemo(() => {
    const out: Record<string, PermissionDef[]> = {};
    for (const p of ALL_PERMISSIONS) {
      out[p.category] = out[p.category] || [];
      out[p.category].push(p);
    }
    return out;
  }, []);

  function togglePerm(key: PermissionKey) {
    const has = role.permissions.includes(key);
    const next = has
      ? role.permissions.filter((p) => p !== key)
      : [...role.permissions, key];
    onChange({ permissions: next });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="h-4 w-4 rounded-full shrink-0"
            style={{ backgroundColor: role.color }}
          />
          <div className="min-w-0">
            <h3 className="font-semibold text-base truncate">{role.name}</h3>
            <p className="text-[11px] text-muted-foreground">
              Priority {role.priority}
              {role.system && (
                <Badge
                  variant="secondary"
                  className="ml-2 text-[9px] uppercase"
                >
                  system
                </Badge>
              )}
            </p>
          </div>
        </div>
        {!role.system && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] items-end">
          <div className="space-y-1.5">
            <Label htmlFor={`role-name-${role.id}`}>Name</Label>
            <Input
              id={`role-name-${role.id}`}
              value={role.name}
              onChange={(e) => onChange({ name: e.target.value })}
              maxLength={40}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`role-priority-${role.id}`}>Priority</Label>
            <Input
              id={`role-priority-${role.id}`}
              type="number"
              value={role.priority}
              onChange={(e) =>
                onChange({ priority: parseInt(e.target.value, 10) || 0 })
              }
              className="w-24"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex flex-wrap items-center gap-1.5">
            {ROLE_COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange({ color: c })}
                aria-label={`Set color ${c}`}
                className={cn(
                  "h-7 w-7 rounded-full border-2 transition-transform",
                  role.color.toLowerCase() === c.toLowerCase()
                    ? "border-foreground scale-110"
                    : "border-transparent hover:scale-105",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={role.color}
              onChange={(e) => onChange({ color: e.target.value })}
              className="h-7 w-7 rounded cursor-pointer ml-1"
              title="Custom color"
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <Label>Permissions ({role.permissions.length})</Label>
          {Object.entries(PERMISSION_GROUPS).map(([cat, label]) => {
            const perms = grouped[cat];
            if (!perms || perms.length === 0) return null;
            return (
              <div key={cat}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/60 mb-1.5">
                  {label}
                </p>
                <div className="space-y-1">
                  {perms.map((p) => {
                    const checked = role.permissions.includes(p.key);
                    return (
                      <label
                        key={p.key}
                        className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-primary/5 cursor-pointer"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => togglePerm(p.key)}
                          className="mt-0.5"
                          disabled={role.system}
                        />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium">
                            {p.label}
                          </span>
                          <span className="block text-[11px] text-muted-foreground leading-snug">
                            {p.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {role.system && (
            <p className="text-[11px] text-muted-foreground italic">
              System roles can&apos;t be edited (color and members are
              still configurable).
            </p>
          )}
        </div>

        <div className="flex justify-end pt-2 text-[11px] text-muted-foreground italic">
          <Save className="h-3 w-3 mr-1" /> Changes save automatically.
        </div>
      </CardContent>
    </Card>
  );
}
