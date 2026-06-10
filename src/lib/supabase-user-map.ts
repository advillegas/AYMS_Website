"use client";

/**
 * Maps a Supabase `public.users` row (snake_case columns) into the
 * camelCase, Firestore-doc-shaped object the existing community code
 * already consumes. `last_active_at` (ISO string) is wrapped in a
 * `{ toMillis() }` shim so presence helpers written against Firestore
 * Timestamps keep working unchanged.
 */

import type { User } from "./store";
import type { PresenceStatus } from "./use-presence";

export interface SupabaseUserRow {
  id: string;
  /**
   * Supabase auth uid linked to this canonical row (null until the
   * user's first Supabase login backfills it via link_auth_identity).
   * NOT the same as `id` for migrated members, whose ids are their
   * original Firebase UIDs.
   */
  auth_id: string | null;
  name: string | null;
  email: string | null;
  avatar: string | null;
  bio: string | null;
  location: string | null;
  joined_date: string | null;
  role: string | null;
  name_display: string | null;
  dm_privacy: string | null;
  pronouns: string | null;
  headline: string | null;
  cover_photo: string | null;
  bio_long: string | null;
  instagram: string | null;
  tiktok: string | null;
  twitter: string | null;
  linkedin: string | null;
  website: string | null;
  interests: string[] | null;
  languages: string[] | null;
  top_friend_ids: string[] | null;
  gallery_photos: string[] | null;
  email_visibility: string | null;
  profile_visibility: string | null;
  geo_lat: number | null;
  geo_lng: number | null;
  manual_locations: Array<{ label: string; lat: number; lng: number }> | null;
  local_radius_miles: number | null;
  event_radius_miles: number | null;
  local_chat_visibility: string | null;
  status: string | null;
  manual_override: boolean | null;
  last_active_at: string | null;
}

/** Timestamp-shim so `.toMillis()` callers work with Postgres ISO. */
export interface TimestampLike {
  toMillis(): number;
  toDate(): Date;
}

export function isoToTimestampLike(iso: string | null): TimestampLike | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return { toMillis: () => ms, toDate: () => new Date(ms) };
}

/** Shape consumed by use-community-members (its local FirestoreUserDoc). */
export interface MappedUserDoc {
  id: string;
  authId?: string;
  name?: string;
  email?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  joinedDate?: string;
  role?: User["role"];
  nameDisplay?: User["nameDisplay"];
  dmPrivacy?: User["dmPrivacy"];
  pronouns?: string;
  headline?: string;
  coverPhoto?: string;
  bioLong?: string;
  instagram?: string;
  tiktok?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
  interests?: string[];
  languages?: string[];
  topFriendIds?: string[];
  galleryPhotos?: string[];
  emailVisibility?: User["emailVisibility"];
  profileVisibility?: User["profileVisibility"];
  geoLat?: number;
  geoLng?: number;
  manualLocations?: Array<{ label: string; lat: number; lng: number }>;
  localRadiusMiles?: number;
  eventRadiusMiles?: number;
  localChatVisibility?: "everyone" | "radius";
  status?: PresenceStatus;
  manualOverride?: boolean;
  lastActiveAt?: TimestampLike | null;
}

const u = <T>(v: T | null): T | undefined => (v == null ? undefined : v);

export function mapUserRowToDoc(r: SupabaseUserRow): MappedUserDoc {
  return {
    id: r.id,
    authId: u(r.auth_id),
    name: u(r.name),
    email: u(r.email),
    avatar: u(r.avatar),
    bio: u(r.bio),
    location: u(r.location),
    joinedDate: u(r.joined_date),
    role: u(r.role) as User["role"] | undefined,
    nameDisplay: u(r.name_display) as User["nameDisplay"] | undefined,
    dmPrivacy: u(r.dm_privacy) as User["dmPrivacy"] | undefined,
    pronouns: u(r.pronouns),
    headline: u(r.headline),
    coverPhoto: u(r.cover_photo),
    bioLong: u(r.bio_long),
    instagram: u(r.instagram),
    tiktok: u(r.tiktok),
    twitter: u(r.twitter),
    linkedin: u(r.linkedin),
    website: u(r.website),
    interests: u(r.interests),
    languages: u(r.languages),
    topFriendIds: u(r.top_friend_ids),
    galleryPhotos: u(r.gallery_photos),
    emailVisibility: u(r.email_visibility) as User["emailVisibility"] | undefined,
    profileVisibility: u(r.profile_visibility) as User["profileVisibility"] | undefined,
    geoLat: u(r.geo_lat),
    geoLng: u(r.geo_lng),
    manualLocations: u(r.manual_locations),
    localRadiusMiles: u(r.local_radius_miles),
    eventRadiusMiles: u(r.event_radius_miles),
    localChatVisibility: u(r.local_chat_visibility) as "everyone" | "radius" | undefined,
    status: u(r.status) as PresenceStatus | undefined,
    manualOverride: u(r.manual_override),
    lastActiveAt: isoToTimestampLike(r.last_active_at),
  };
}

/**
 * Map the app's User to a Supabase users-row for upsert. Only includes
 * defined fields (plus identity columns) so a basic sign-in doesn't
 * clobber rich profile data with nulls — mirrors the Firestore
 * "merge + only-if-defined" write.
 */
export function userToRow(user: User): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar ?? "",
    bio: user.bio ?? "",
    location: user.location ?? "",
    role: user.role,
    joined_date: user.joinedDate,
    name_display: user.nameDisplay ?? "full",
    dm_privacy: user.dmPrivacy ?? "anyone",
    last_active_at: new Date().toISOString(),
  };
  const opt: Array<[keyof User, string]> = [
    ["pronouns", "pronouns"],
    ["headline", "headline"],
    ["coverPhoto", "cover_photo"],
    ["bioLong", "bio_long"],
    ["instagram", "instagram"],
    ["tiktok", "tiktok"],
    ["twitter", "twitter"],
    ["linkedin", "linkedin"],
    ["website", "website"],
    ["interests", "interests"],
    ["languages", "languages"],
    ["topFriendIds", "top_friend_ids"],
    ["galleryPhotos", "gallery_photos"],
    ["emailVisibility", "email_visibility"],
    ["profileVisibility", "profile_visibility"],
    ["manualLocations", "manual_locations"],
    ["localRadiusMiles", "local_radius_miles"],
    ["eventRadiusMiles", "event_radius_miles"],
    ["localChatVisibility", "local_chat_visibility"],
  ];
  for (const [k, col] of opt) {
    if (user[k] !== undefined) row[col] = user[k];
  }
  return row;
}

/** Map a row to the app's full User object (for auth profile load). */
export function mapUserRowToUser(r: SupabaseUserRow): User {
  const d = mapUserRowToDoc(r);
  return {
    id: r.id,
    name: d.name ?? "",
    email: d.email ?? "",
    avatar: d.avatar ?? "",
    bio: d.bio ?? "",
    location: d.location ?? "",
    joinedDate: d.joinedDate ?? new Date().toISOString().split("T")[0],
    role: d.role ?? "amiga",
    nameDisplay: d.nameDisplay,
    dmPrivacy: d.dmPrivacy,
    pronouns: d.pronouns,
    headline: d.headline,
    coverPhoto: d.coverPhoto,
    bioLong: d.bioLong,
    instagram: d.instagram,
    tiktok: d.tiktok,
    twitter: d.twitter,
    linkedin: d.linkedin,
    website: d.website,
    interests: d.interests,
    languages: d.languages,
    topFriendIds: d.topFriendIds,
    galleryPhotos: d.galleryPhotos,
    emailVisibility: d.emailVisibility,
    profileVisibility: d.profileVisibility,
    geoLat: d.geoLat,
    geoLng: d.geoLng,
    manualLocations: d.manualLocations,
    localRadiusMiles: d.localRadiusMiles,
    eventRadiusMiles: d.eventRadiusMiles,
    localChatVisibility: d.localChatVisibility,
  };
}
