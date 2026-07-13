import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { type CalendarEvent } from "./events-data";
import {
  firebaseSignUp,
  firebaseSignIn,
  firebaseSignOut,
  firebaseSignInWithGoogle,
  firebaseSendPasswordReset,
  upsertUserProfile,
  ensureFirebaseAdminSession,
  friendlyAuthError,
} from "./firebase-auth";
import { isFirebaseConfigured } from "./firebase";
import { useSupabaseBackend } from "./supabase";
import { CONFIRM_EMAIL, ensureSupabaseAdminSession } from "./supabase-auth";
import { trackEvent } from "./activity-tracker";
import type { NameDisplay } from "./name-format";

// Re-exported so existing consumers (UI components) can keep importing
// CalendarEvent from "@/lib/store" without churn.
export type { CalendarEvent };

/**
 * Who can start a DM with this user.
 *
 * - "anyone": every member can DM. The default - keeps the social
 *   graph open so the community can actually network.
 * - "friends": only people the user has accepted as friends can DM.
 * - "none": DMs disabled entirely; the Message button is hidden and
 *   any attempt is rejected with a friendly error.
 */
export type DMPrivacy = "anyone" | "friends" | "none";
export type EmailVisibility = "public" | "friends" | "hidden";
export type ProfileVisibility = "public" | "community" | "friends";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  location: string;
  joinedDate: string;
  role: "amiga" | "leader" | "admin";
  nameDisplay?: NameDisplay;
  dmPrivacy?: DMPrivacy;

  // Rich profile fields
  pronouns?: string;
  headline?: string;
  coverPhoto?: string;
  bioLong?: string;

  // Social links
  instagram?: string;
  tiktok?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;

  // Interests + languages (vectorizable for future algo)
  interests?: string[];
  languages?: string[];

  // Top friends (user-curated, max 8)
  topFriendIds?: string[];

  // Photo gallery (Firebase Storage URLs, max 6)
  galleryPhotos?: string[];

  // Privacy
  emailVisibility?: EmailVisibility;
  profileVisibility?: ProfileVisibility;

  // Geo / location
  geoLat?: number;
  geoLng?: number;
  manualLocations?: Array<{ label: string; lat: number; lng: number }>;
  localRadiusMiles?: number;
  eventRadiusMiles?: number;
  localChatVisibility?: "everyone" | "radius";
  /** Member has finished (or dismissed) the welcome journey — show it once. */
  onboarded?: boolean;
  /** Member has seen the guided community tour — show it once. */
  tourDone?: boolean;
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: string;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "general" | "trips" | "events" | "fun" | "local";
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  /**
   * Out-of-band continuation — no error, but the caller should neither
   * navigate nor toast success yet:
   *  - "oauth-redirect": the browser is navigating to the OAuth
   *    provider; the session is applied on return.
   *  - "confirm-email": the Supabase project requires email
   *    confirmation before the first sign-in.
   */
  pending?: "oauth-redirect" | "confirm-email";
}

interface RegisteredUser extends User {
  passwordHash: string;
  salt: string;
}

type ProfilePatch = Partial<
  Pick<
    User,
    | "name"
    | "avatar"
    | "bio"
    | "location"
    | "nameDisplay"
    | "dmPrivacy"
    | "pronouns"
    | "headline"
    | "coverPhoto"
    | "bioLong"
    | "instagram"
    | "tiktok"
    | "twitter"
    | "linkedin"
    | "website"
    | "interests"
    | "languages"
    | "topFriendIds"
    | "galleryPhotos"
    | "emailVisibility"
    | "profileVisibility"
    | "geoLat"
    | "geoLng"
    | "manualLocations"
    | "localRadiusMiles"
    | "eventRadiusMiles"
    | "localChatVisibility"
    | "onboarded"
    | "tourDone"
  >
>;

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  registry: RegisteredUser[];
  login: (identifier: string, password: string) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<AuthResult>;
  logout: () => Promise<void>;
  /** Persist a profile patch. Resolves true when the backend write
   *  succeeded, false if it failed (so the UI can show an honest error). */
  updateProfile: (patch: ProfilePatch) => Promise<boolean>;
  /**
   * Send a Firebase password reset email. Resolves with `{ ok: true }`
   * on success, or `{ ok: false, error }` with a UI-ready message.
   */
  sendPasswordReset: (email: string) => Promise<AuthResult>;
}

interface ChatState {
  messages: Message[];
  activeChannel: string;
  setActiveChannel: (id: string) => void;
  sendMessage: (content: string) => void;
}

// EventState kept for backward compat; the real hook is in use-events.ts
interface EventState {
  events: CalendarEvent[];
}

interface CommunityState {
  members: User[];
  onlineMembers: string[];
}

/**
 * Client-side password hashing for the legacy localStorage registry
 * fallback (used only when Firebase isn't configured). SHA-256 over a
 * per-user random salt so passwords are never stored reversibly in
 * localStorage. This is NOT a substitute for server-side auth: the
 * canonical path is Firebase Auth, which uses scrypt server-side. For a
 * self-hosted backend use bcrypt/argon2 behind a real auth provider.
 */
function makeSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

const MOCK_USERS: User[] = [
  {
    id: "1",
    name: "Maria Garcia",
    email: "maria@amigasymassocial.com",
    avatar: "",
    bio: "Five-year vet who loves long walks watching elephant seals",
    location: "Los Angeles, CA",
    joinedDate: "2021-03-15",
    role: "leader",
  },
  {
    id: "2",
    name: "Sofia Rodriguez",
    email: "sofia@amigasymassocial.com",
    avatar: "",
    bio: "Travel enthusiast and foodie. Always planning the next adventure!",
    location: "Miami, FL",
    joinedDate: "2022-06-20",
    role: "amiga",
  },
  {
    id: "3",
    name: "Isabella Martinez",
    email: "isabella@amigasymassocial.com",
    avatar: "",
    bio: "Camp counselor and community organizer",
    location: "Austin, TX",
    joinedDate: "2022-01-10",
    role: "leader",
  },
  {
    id: "4",
    name: "Valentina Lopez",
    email: "valentina@amigasymassocial.com",
    avatar: "",
    bio: "New to the group but already feel like family!",
    location: "New York, NY",
    joinedDate: "2024-09-01",
    role: "amiga",
  },
  {
    id: "5",
    name: "Camila Torres",
    email: "camila@amigasymassocial.com",
    avatar: "",
    bio: "Photographer and storyteller. Capturing our memories together.",
    location: "Chicago, IL",
    joinedDate: "2023-04-12",
    role: "amiga",
  },
];

// MOCK_CHANNELS removed: channels now live in use-channels-store with
// CRUD support and persistence.

const MOCK_MESSAGES: Message[] = [
  { id: "m1", channelId: "general", userId: "1", userName: "Maria Garcia", userAvatar: "", content: "Welcome to Amigas Y Más! So happy to have everyone here 💕", timestamp: "2026-04-15T09:00:00Z" },
  { id: "m2", channelId: "general", userId: "2", userName: "Sofia Rodriguez", userAvatar: "", content: "Hey everyone! Can't wait for the next trip!", timestamp: "2026-04-15T09:15:00Z" },
  { id: "m3", channelId: "general", userId: "3", userName: "Isabella Martinez", userAvatar: "", content: "Who's coming to the summer camp this year? 🏕️", timestamp: "2026-04-15T09:30:00Z" },
  { id: "m4", channelId: "general", userId: "4", userName: "Valentina Lopez", userAvatar: "", content: "I just joined and I already love this community!", timestamp: "2026-04-15T10:00:00Z" },
  { id: "m5", channelId: "trip-planning", userId: "1", userName: "Maria Garcia", userAvatar: "", content: "Thinking about a Cancún trip in August. Who's interested?", timestamp: "2026-04-14T14:00:00Z" },
  { id: "m6", channelId: "trip-planning", userId: "5", userName: "Camila Torres", userAvatar: "", content: "Count me in! I'll bring my camera 📸", timestamp: "2026-04-14T14:30:00Z" },
  { id: "m7", channelId: "announcements", userId: "1", userName: "Maria Garcia", userAvatar: "", content: "Coffee and Cuties event is coming up on May 19th! Don't miss it ☕", timestamp: "2026-04-13T08:00:00Z" },
  { id: "m8", channelId: "camp-talk", userId: "3", userName: "Isabella Martinez", userAvatar: "", content: "Camp registrations are now open! Early bird pricing ends May 1st.", timestamp: "2026-04-12T10:00:00Z" },
  { id: "m9", channelId: "recipes", userId: "2", userName: "Sofia Rodriguez", userAvatar: "", content: "Just made the best tamales ever. Recipe coming soon! 🫔", timestamp: "2026-04-11T18:00:00Z" },
  { id: "m10", channelId: "random", userId: "4", userName: "Valentina Lopez", userAvatar: "", content: "Anyone watching the new season of that show? No spoilers please! 😂", timestamp: "2026-04-15T11:00:00Z" },
];

// Canonical events live in events-data.ts so server-side code (e.g. the
// /api/calendar/feed iCal route) can import the same source of truth.

/**
 * Auth store.
 *
 * Default state is logged-out so the /admin and /community routes are
 * properly gated. Admin login is validated server-side via
 * /api/auth/login (which checks ADMIN_PASSWORD from env). Regular user
 * accounts live in a localStorage-persisted registry; this is fine for
 * a soft launch but should be replaced by a real auth provider before
 * public release - see SECURITY note in README/CLAUDE.md.
 */
export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      registry: [],

      login: async (identifier, password) => {
        const id = identifier.trim();
        if (!id || !password) {
          return { ok: false, error: "Please enter your username and password" };
        }

        // 1. Try server-side admin auth first. The /api/auth/login
        //    route validates against the ADMIN_PASSWORD env var and
        //    returns an "admin" user. We mirror that profile to
        //    Firestore so the admin shows up in the members list.
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: id, password }),
          });
          const data: {
            ok: boolean;
            user?: User;
            error?: string;
            fallback?: boolean;
          } = await res.json();

          if (data.ok && data.user) {
            set({ user: data.user, isAuthenticated: true });
            void upsertUserProfile(data.user);
            // Bridge the password-only admin into a real Firebase Auth
            // session so client-side admin writes (events, calendar feeds,
            // testimonials, config) pass the Firestore isAdmin() rules.
            // Best-effort; the UI identity stays the legacy "admin".
            void ensureFirebaseAdminSession(password);
            // Same bridge for Supabase (dual-run): /api/auth/login has
            // already provisioned admin@amigasymassocial.com server-side; this
            // signs in so admin writes carry a JWT RLS can see.
            if (useSupabaseBackend) void ensureSupabaseAdminSession(password);
            trackEvent("sign_in", { method: "admin" });
            return { ok: true };
          }
          if (!data.fallback && data.error) {
            return { ok: false, error: data.error };
          }
        } catch {
          // Network error - fall through to other auth paths.
        }

        // 2. Try the configured auth backend (Firebase, or Supabase
        //    when the migration flag is on) — the canonical path.
        if ((isFirebaseConfigured || useSupabaseBackend) && id.includes("@")) {
          try {
            const fbUser = await firebaseSignIn(id, password);
            if (fbUser) {
              set({ user: fbUser, isAuthenticated: true });
              trackEvent("sign_in", { method: "password" });
              return { ok: true };
            }
          } catch (e) {
            // Distinguish "wrong password" from a generic config issue.
            // Firebase auth errors carry `auth/*` codes; Supabase
            // GoTrue throws AuthApiError with an HTTP status. Surface
            // either; under the Supabase backend surface EVERYTHING —
            // falling through to the legacy registry would mask a real
            // auth failure as "No account found with that email".
            const err = e as { code?: string; name?: string; status?: number };
            const isAuthError =
              (err?.code ?? "").startsWith("auth/") ||
              err?.name === "AuthApiError" ||
              typeof err?.status === "number";
            if (useSupabaseBackend || isAuthError) {
              return { ok: false, error: friendlyAuthError(e) };
            }
          }
        }

        // 3. Legacy local registry fallback (only used when Firebase
        //    isn't configured, or for accounts created before Firebase
        //    Auth was wired in). Hard-disabled under the Supabase
        //    backend: stale localStorage accounts must never shadow
        //    real auth results.
        if (useSupabaseBackend) {
          return {
            ok: false,
            error: id.includes("@")
              ? "Email or password is incorrect."
              : "Sign in with your email address.",
          };
        }
        const lower = id.toLowerCase();
        const registered = get().registry.find(
          (u) => u.email.toLowerCase() === lower,
        );
        if (!registered) {
          return { ok: false, error: "No account found with that email" };
        }
        if (registered.passwordHash !== (await hashPassword(password, registered.salt))) {
          return { ok: false, error: "Incorrect password" };
        }
        const { passwordHash: _ph, salt: _salt, ...user } = registered;
        void _ph;
        void _salt;
        set({ user, isAuthenticated: true });
        // Mirror legacy users into Firestore on login so they
        // start showing up in the members list.
        void upsertUserProfile(user);
        trackEvent("sign_in", { method: "legacy" });
        return { ok: true };
      },

      register: async (name, email, password) => {
        const trimmedName = name.trim();
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedName || !trimmedEmail || !password) {
          return { ok: false, error: "All fields are required" };
        }
        if (password.length < 6) {
          return { ok: false, error: "Password must be at least 6 characters" };
        }
        if (
          trimmedEmail === "admin@amigasymassocial.com" ||
          trimmedEmail === "admin"
        ) {
          return { ok: false, error: "That username is reserved" };
        }

        // Preferred path: the configured auth backend (Firebase, or
        // Supabase when the migration flag is on). Creates an
        // authenticated user and upserts the profile row/doc.
        if (isFirebaseConfigured || useSupabaseBackend) {
          try {
            const fbUser = await firebaseSignUp(trimmedName, trimmedEmail, password);
            if (fbUser === CONFIRM_EMAIL) {
              // Confirm-email Supabase projects return no session from
              // signUp. Don't fake an authenticated state — hand the
              // page a pending result so it can show "check your
              // inbox"; the users row is seeded on the first real
              // sign-in after confirmation.
              trackEvent("sign_up", { method: "password", pending: true });
              return { ok: true, pending: "confirm-email" };
            }
            if (fbUser) {
              set({ user: fbUser, isAuthenticated: true });
              trackEvent("sign_up", { method: "password" });
              return { ok: true };
            }
          } catch (e) {
            return { ok: false, error: friendlyAuthError(e) };
          }
          // Hard-stop under the Supabase backend: never fall through
          // to the localStorage registry (it would "succeed" locally
          // while no real account exists).
          if (useSupabaseBackend) {
            return {
              ok: false,
              error: "Could not create the account. Please try again.",
            };
          }
        }

        // Fallback: legacy localStorage-only registry. Used when
        // Firebase isn't configured (dev environments without env
        // vars) so the sign-up flow still works end-to-end.
        const exists = get().registry.find(
          (u) => u.email.toLowerCase() === trimmedEmail,
        );
        if (exists) {
          return { ok: false, error: "An account with that email already exists" };
        }
        const salt = makeSalt();
        const newUser: RegisteredUser = {
          id: `u-${Date.now()}`,
          name: trimmedName,
          email: trimmedEmail,
          avatar: "",
          bio: "New amiga!",
          location: "",
          joinedDate: new Date().toISOString().split("T")[0],
          role: "amiga",
          passwordHash: await hashPassword(password, salt),
          salt,
        };
        const { passwordHash: _ph, salt: _salt, ...user } = newUser;
        void _ph;
        void _salt;
        set((s) => ({
          registry: [...s.registry, newUser],
          user,
          isAuthenticated: true,
        }));
        // Best-effort Firestore mirror so even legacy registrations
        // appear in the members list as soon as Firebase comes online.
        void upsertUserProfile(user);
        trackEvent("sign_up", { method: "legacy" });
        return { ok: true };
      },

      loginWithGoogle: async () => {
        if (!isFirebaseConfigured && !useSupabaseBackend) {
          return {
            ok: false,
            error:
              "Google sign-in needs a configured backend. Add your auth env vars and reload.",
          };
        }
        try {
          const fbUser = await firebaseSignInWithGoogle();
          if (!fbUser) {
            if (useSupabaseBackend) {
              // Supabase OAuth is a full-page redirect: null means the
              // browser is about to navigate away, not a failure. The
              // session is applied on return by onSupabaseAuthChange
              // (that return path isn't tracked — see activity-tracker).
              return { ok: true, pending: "oauth-redirect" };
            }
            return {
              ok: false,
              error: "Couldn't complete Google sign-in. Try again.",
            };
          }
          set({ user: fbUser, isAuthenticated: true });
          trackEvent("sign_in", { method: "google" });
          return { ok: true };
        } catch (e) {
          return { ok: false, error: friendlyAuthError(e) };
        }
      },

      logout: async () => {
        await firebaseSignOut();
        set({ user: null, isAuthenticated: false });
      },

      sendPasswordReset: async (email) => {
        const trimmed = email.trim();
        if (!trimmed) {
          return { ok: false, error: "Enter your email address first." };
        }
        if (!isFirebaseConfigured && !useSupabaseBackend) {
          return {
            ok: false,
            error:
              "Password reset needs a configured auth backend. Contact an admin to enable it.",
          };
        }
        try {
          await firebaseSendPasswordReset(trimmed);
          return { ok: true };
        } catch (e) {
          return { ok: false, error: friendlyAuthError(e) };
        }
      },

      updateProfile: async (patch) => {
        let updated: User | null = null;
        set((s) => {
          if (!s.user) return s;
          const next: User = { ...s.user, ...patch };
          updated = next;
          // Mirror into the local registry so the change survives a
          // re-login as the same registered user. Admin + Firebase
          // Auth users (who aren't in the legacy registry) are a no-op
          // for this map.
          const registry = s.registry.map((r) =>
            r.id === next.id ? { ...r, ...patch } : r,
          );
          return { user: next, registry };
        });
        if (updated) {
          return await upsertUserProfile(updated);
        }
        return false;
      },
    }),
    {
      name: "ayms-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        user: s.user,
        isAuthenticated: s.isAuthenticated,
        registry: s.registry,
      }),
    },
  ),
);

export const useChat = create<ChatState>()((set, get) => ({
  messages: MOCK_MESSAGES,
  activeChannel: "general",
  setActiveChannel: (id: string) => set({ activeChannel: id }),
  sendMessage: (content: string) => {
    const { user } = useAuth.getState();
    if (!user) return;
    const msg: Message = {
      id: `m${Date.now()}`,
      channelId: get().activeChannel,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      content,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, msg] }));
  },
}));

// Legacy compat: re-export useEvents from use-events.ts. Old consumers
// that import { useEvents } from "@/lib/store" keep working; they just
// get the Firestore-backed hook now instead of the static array.
export { useEvents } from "./use-events";

export const useCommunity = create<CommunityState>(() => ({
  members: MOCK_USERS,
  onlineMembers: ["1", "2", "4"],
}));
