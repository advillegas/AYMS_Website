"use client";

/**
 * Role + permission model for the AYMS community.
 *
 * Design notes:
 *  - Roles are stored in a Zustand+localStorage store (use-roles-store).
 *    Membership (which user has which roles) lives in the same store
 *    so the admin UI can manage it without poking other state.
 *  - Permissions are simple string keys grouped by category. Checks
 *    happen client-side via hasPermission(). For real production
 *    enforcement, mirror the same checks in Firestore security rules.
 *  - A user can hold multiple roles. Their effective permission set is
 *    the union of their roles. Their displayed color is the highest-
 *    priority role's color.
 */

export type PermissionKey =
  | "viewChannels"
  | "sendMessages"
  | "manageMessages"
  | "manageChannels"
  | "reorderChannels"
  | "manageRoles"
  | "manageMembers"
  | "kickMembers"
  | "banMembers"
  | "muteMembers"
  | "createPolls"
  | "votePolls"
  | "mentionEveryone"
  | "uploadFiles"
  | "addReactions"
  | "createThreads"
  | "useVoice"
  | "useVideo"
  | "manageCalendar"
  | "viewAdminPanel";

export interface PermissionDef {
  key: PermissionKey;
  label: string;
  description: string;
  category: "general" | "messages" | "moderation" | "voice" | "admin";
  // Permissions that imply this one - showing the user that granting
  // a higher perm covers the lower ones.
  impliedBy?: PermissionKey[];
}

export const ALL_PERMISSIONS: PermissionDef[] = [
  // General
  {
    key: "viewChannels",
    label: "View channels",
    description: "See channels the role has access to.",
    category: "general",
  },
  {
    key: "viewAdminPanel",
    label: "Open admin panel",
    description: "Access the /community/admin area.",
    category: "general",
  },

  // Messages
  {
    key: "sendMessages",
    label: "Send messages",
    description: "Post in channels they can view.",
    category: "messages",
  },
  {
    key: "addReactions",
    label: "Add reactions",
    description: "React to messages with emojis.",
    category: "messages",
  },
  {
    key: "createThreads",
    label: "Reply in threads",
    description: "Open threaded conversations on messages.",
    category: "messages",
  },
  {
    key: "uploadFiles",
    label: "Upload files",
    description: "Send GIFs, images, and other attachments.",
    category: "messages",
  },
  {
    key: "createPolls",
    label: "Create polls / giveaways",
    description: "Run polls and giveaways inside chat.",
    category: "messages",
  },
  {
    key: "votePolls",
    label: "Vote in polls / enter giveaways",
    description:
      "Cast a vote on existing polls and enter giveaways. Disable to make polls read-only for a role.",
    category: "messages",
  },
  {
    key: "mentionEveryone",
    label: "Mention @everyone / @channel",
    description: "Trigger a high-priority notification to the whole channel.",
    category: "messages",
  },

  // Moderation
  {
    key: "manageMessages",
    label: "Manage messages",
    description: "Delete or pin any message.",
    category: "moderation",
  },
  {
    key: "manageChannels",
    label: "Manage channels",
    description: "Create / rename / delete channels and edit restrictions.",
    category: "moderation",
  },
  {
    key: "reorderChannels",
    label: "Reorder channels",
    description:
      "Rearrange channels within a category. Granted to channel curators who shouldn't have full manage-channels rights.",
    category: "moderation",
  },
  {
    key: "manageRoles",
    label: "Manage roles",
    description: "Create roles, assign permissions, assign members to roles.",
    category: "moderation",
  },
  {
    key: "manageMembers",
    label: "Manage members",
    description: "Edit member profiles and assignments.",
    category: "moderation",
  },
  {
    key: "muteMembers",
    label: "Mute members",
    description: "Temporarily prevent a member from posting.",
    category: "moderation",
  },
  {
    key: "kickMembers",
    label: "Kick members",
    description: "Remove a member from the community (they can re-join).",
    category: "moderation",
  },
  {
    key: "banMembers",
    label: "Ban members",
    description: "Permanently remove a member.",
    category: "moderation",
  },

  // Voice
  {
    key: "useVoice",
    label: "Use voice channels",
    description: "Join voice rooms.",
    category: "voice",
  },
  {
    key: "useVideo",
    label: "Use video channels",
    description: "Join video / streaming rooms.",
    category: "voice",
  },

  // Admin
  {
    key: "manageCalendar",
    label: "Manage calendar",
    description:
      "Add and sync external calendar feeds, and create / edit / delete community events.",
    category: "admin",
  },
];

/**
 * Curated palette for the role color picker. Hex values selected from
 * the AYMS brand kit + a handful of contrasting accents so admins can
 * tell roles apart at a glance.
 */
export const ROLE_COLOR_PRESETS = [
  "#FF0099", // brand magenta
  "#FF6F61", // coral
  "#9C27B0", // purple
  "#3F51B5", // indigo
  "#2196F3", // blue
  "#00BCD4", // cyan
  "#4CAF50", // green
  "#8BC34A", // lime
  "#FFC107", // amber
  "#FF9800", // orange
  "#FF5722", // deep orange
  "#795548", // brown
  "#607D8B", // slate
  "#E91E63", // pink
];

export interface Role {
  id: string;
  name: string;
  color: string;
  /**
   * Higher = more important. Used for color resolution (the highest-
   * priority role wins) and for sorting lists. Admin should sit at the
   * top, regular member at the bottom.
   */
  priority: number;
  permissions: PermissionKey[];
  /**
   * System roles can't be deleted from the admin UI - protects the
   * fallback Admin role from being nuked.
   */
  system?: boolean;
}

/**
 * Default seed roles. Loaded once on first run and persisted; the
 * admin can mutate them freely afterwards.
 */
export const DEFAULT_ROLES: Role[] = [
  {
    id: "role-admin",
    name: "Admin",
    color: "#FF0099",
    priority: 100,
    system: true,
    permissions: ALL_PERMISSIONS.map((p) => p.key),
  },
  {
    id: "role-leader",
    name: "Leader",
    color: "#FF6F61",
    priority: 50,
    permissions: [
      "viewChannels",
      "sendMessages",
      "addReactions",
      "createThreads",
      "uploadFiles",
      "createPolls",
      "votePolls",
      "mentionEveryone",
      "manageMessages",
      "muteMembers",
      "reorderChannels",
      "useVoice",
      "useVideo",
    ],
  },
  {
    id: "role-amiga",
    name: "Amiga",
    color: "#9C27B0",
    priority: 10,
    permissions: [
      "viewChannels",
      "sendMessages",
      "addReactions",
      "createThreads",
      "uploadFiles",
      "votePolls",
      "useVoice",
      "useVideo",
    ],
  },
];

export const DEFAULT_USER_ROLES: Record<string, string[]> = {
  // Admin user (server-side login - id comes back as "admin" from /api/auth/login).
  admin: ["role-admin"],
  // Static MOCK_USERS roles.
  "1": ["role-leader"], // Maria
  "2": ["role-amiga"], // Sofia
  "3": ["role-leader"], // Isabella
  "4": ["role-amiga"], // Valentina
  "5": ["role-amiga"], // Camila
};

/**
 * Resolve a user's role list given the global role registry + their
 * roleIds. Sorted by descending priority so the first item is the
 * "highest" role (used for color + display).
 */
export function resolveRoles(
  allRoles: Role[],
  roleIds: string[] | undefined,
): Role[] {
  if (!roleIds || roleIds.length === 0) return [];
  const ids = new Set(roleIds);
  return allRoles
    .filter((r) => ids.has(r.id))
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Returns true if any of the user's roles grants the given permission.
 * Pre-resolved roles array - cheap to call in render paths.
 */
export function hasPermission(roles: Role[], perm: PermissionKey): boolean {
  for (const r of roles) {
    if (r.permissions.includes(perm)) return true;
  }
  return false;
}

export function highestRole(roles: Role[]): Role | null {
  return roles[0] ?? null;
}

/**
 * Color hex for a user's display name in chat / member list. Returns
 * undefined if no role assigned (so the UI uses default text color).
 */
export function nameColor(roles: Role[]): string | undefined {
  return roles[0]?.color;
}
