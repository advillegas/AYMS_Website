// One-pass Firestore -> Supabase data migration.
//
// Reads every collection with Firebase Admin privileges (service-account
// OAuth token bypasses security rules), converts Firestore's typed value
// format to plain JS, maps each collection to its Postgres table, and
// upserts into Supabase via PostgREST with the service-role key.
//
// Env:
//   FIREBASE_SA   = path to service-account JSON
//   SUPABASE_REF  = project ref
//   SUPABASE_KEY  = service_role key
//
// Idempotent: every upsert merges on the primary key, so re-running is safe.

import fs from "fs";
import crypto from "crypto";

const SA = JSON.parse(fs.readFileSync(process.env.FIREBASE_SA, "utf8"));
const PROJECT = SA.project_id;
const REF = process.env.SUPABASE_REF;
const SVC = process.env.SUPABASE_KEY;
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const SB_BASE = `https://${REF}.supabase.co/rest/v1`;

/* ---------------- Admin OAuth token (RS256 JWT -> token) ---------------- */
function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: SA.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: SA.token_uri,
    iat: now,
    exp: now + 3600,
  }));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const sig = b64url(signer.sign(SA.private_key));
  const assertion = `${header}.${claim}.${sig}`;
  const res = await fetch(SA.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error("token mint failed: " + JSON.stringify(j));
  return j.access_token;
}

/* ---------------- Firestore typed-value -> plain JS ---------------- */
function conv(v) {
  if (v == null) return null;
  if ("nullValue" in v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("timestampValue" in v) return v.timestampValue; // ISO 8601 already
  if ("geoPointValue" in v) return { lat: v.geoPointValue.latitude, lng: v.geoPointValue.longitude };
  if ("referenceValue" in v) return v.referenceValue;
  if ("bytesValue" in v) return v.bytesValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(conv);
  if ("mapValue" in v) return mapFields(v.mapValue.fields || {});
  return null;
}
function mapFields(fields) {
  const o = {};
  for (const k of Object.keys(fields)) o[k] = conv(fields[k]);
  return o;
}
function docId(name) {
  return name.split("/").pop();
}

let TOKEN;
async function fsList(path) {
  // List all docs under a collection path, following pagination.
  const out = [];
  let pageToken = "";
  do {
    const url = `${FS_BASE}/${path}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!res.ok) {
      if (res.status === 404) return out; // empty collection
      throw new Error(`fsList ${path} -> ${res.status} ${await res.text()}`);
    }
    const j = await res.json();
    for (const d of j.documents || []) out.push({ id: docId(d.name), data: mapFields(d.fields || {}) });
    pageToken = j.nextPageToken || "";
  } while (pageToken);
  return out;
}
async function fsGet(path) {
  const res = await fetch(`${FS_BASE}/${path}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!res.ok) return null;
  const d = await res.json();
  return d.fields ? mapFields(d.fields) : null;
}

/* ---------------- Supabase upsert ---------------- */
async function upsert(table, rows) {
  if (rows.length === 0) return 0;
  let done = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const res = await fetch(`${SB_BASE}/${table}`, {
      method: "POST",
      headers: {
        apikey: SVC,
        Authorization: `Bearer ${SVC}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) throw new Error(`upsert ${table} -> ${res.status} ${await res.text()}`);
    done += batch.length;
  }
  return done;
}

const iso = (v) => (v ? v : null);

/* ---------------- Per-collection transforms ---------------- */
function rowUser(id, d) {
  return {
    id, name: d.name ?? "", email: d.email ?? "", avatar: d.avatar ?? "",
    bio: d.bio ?? "", location: d.location ?? "", joined_date: d.joinedDate ?? null,
    role: d.role ?? "amiga", name_display: d.nameDisplay ?? null, dm_privacy: d.dmPrivacy ?? null,
    pronouns: d.pronouns ?? null, headline: d.headline ?? null, cover_photo: d.coverPhoto ?? null,
    bio_long: d.bioLong ?? null, instagram: d.instagram ?? null, tiktok: d.tiktok ?? null,
    twitter: d.twitter ?? null, linkedin: d.linkedin ?? null, website: d.website ?? null,
    interests: d.interests ?? [], languages: d.languages ?? [], top_friend_ids: d.topFriendIds ?? [],
    gallery_photos: d.galleryPhotos ?? [], email_visibility: d.emailVisibility ?? null,
    profile_visibility: d.profileVisibility ?? null, geo_lat: d.geoLat ?? null, geo_lng: d.geoLng ?? null,
    manual_locations: d.manualLocations ?? [], local_radius_miles: d.localRadiusMiles ?? null,
    event_radius_miles: d.eventRadiusMiles ?? null, local_chat_visibility: d.localChatVisibility ?? null,
    status: d.status ?? null, manual_override: d.manualOverride ?? false,
    last_active_at: iso(d.lastActiveAt), geo_updated_at: iso(d.geoUpdatedAt),
    created_at: iso(d.createdAt) ?? iso(d.joinedDate) ?? new Date().toISOString(),
    raw: d,
  };
}
function rowMessage(id, d) {
  return {
    id, channel_id: d.channelId ?? "", user_id: d.userId ?? "", user_name: d.userName ?? "",
    user_avatar: d.userAvatar ?? "", content: d.content ?? "", attachments: d.attachments ?? [],
    reactions: d.reactions ?? {}, poll: d.poll ?? null, thread_parent_id: d.threadParentId ?? null,
    thread_count: d.threadCount ?? 0, is_post: d.isPost ?? false, post_title: d.postTitle ?? null,
    post_body: d.postBody ?? null, post_media: d.postMedia ?? [], msg_lat: d.msgLat ?? null,
    msg_lng: d.msgLng ?? null, author_local_visibility: d.authorLocalVisibility ?? null,
    created_at: iso(d.createdAt) ?? new Date().toISOString(), edited_at: iso(d.editedAt),
  };
}
function rowConversation(id, d) {
  return {
    id, type: d.type ?? "dm", participant_ids: d.participantIds ?? [], created_by: d.createdBy ?? "",
    name: d.name ?? null, last_message: d.lastMessage ?? null, read_at: d.readAt ?? {},
    typing: d.typing ?? {}, created_at: iso(d.createdAt) ?? new Date().toISOString(),
    updated_at: iso(d.updatedAt) ?? iso(d.createdAt) ?? new Date().toISOString(),
  };
}
function rowConvMessage(id, convId, d) {
  return {
    id, conversation_id: convId, user_id: d.userId ?? "", user_name: d.userName ?? "",
    user_avatar: d.userAvatar ?? "", content: d.content ?? "", attachments: d.attachments ?? [],
    reactions: d.reactions ?? {}, thread_parent_id: d.threadParentId ?? null,
    thread_count: d.threadCount ?? 0, created_at: iso(d.createdAt) ?? new Date().toISOString(),
    edited_at: iso(d.editedAt),
  };
}
function rowFriendship(id, d) {
  return {
    id, participant_ids: d.participantIds ?? [], requester_id: d.requesterId ?? "",
    recipient_id: d.recipientId ?? "", status: d.status ?? "pending",
    created_at: iso(d.createdAt) ?? new Date().toISOString(), accepted_at: iso(d.acceptedAt),
  };
}
function rowEvent(id, d) {
  return {
    id, title: d.title ?? "", description: d.description ?? "", date: d.date ?? null,
    end_date: d.endDate ?? null, start_time: d.startTime ?? null, end_time: d.endTime ?? null,
    type: d.type ?? "social", location: d.location ?? "", source_calendar_id: d.sourceCalendarId ?? null,
    source_uid: d.sourceUid ?? null, synced_at: iso(d.syncedAt), created_by: d.createdBy ?? null,
    created_at: iso(d.createdAt) ?? new Date().toISOString(),
    updated_at: iso(d.updatedAt) ?? iso(d.createdAt) ?? new Date().toISOString(),
  };
}
function rowEventComment(id, eventId, d) {
  return {
    id, event_id: eventId, user_id: d.userId ?? "", user_name: d.userName ?? "",
    user_avatar: d.userAvatar ?? null, content: d.content ?? "",
    created_at: iso(d.createdAt) ?? new Date().toISOString(),
  };
}
function rowSyncConfig(id, d) {
  return {
    id, name: d.name ?? "", ical_url: d.icalUrl ?? "", sync_interval_minutes: d.syncIntervalMinutes ?? 30,
    last_sync_at: iso(d.lastSyncAt), last_sync_error: d.lastSyncError ?? null,
    last_sync_count: d.lastSyncCount ?? null, enabled: d.enabled ?? true,
    created_by: d.createdBy ?? null, created_at: iso(d.createdAt) ?? new Date().toISOString(),
  };
}
const msToIso = (n) => (typeof n === "number" ? new Date(n).toISOString() : iso(n) ?? new Date().toISOString());
function rowChannel(c) {
  return {
    id: c.id, name: c.name ?? "", description: c.description ?? "", icon: c.icon ?? "#",
    category: c.category ?? "general", type: c.type ?? "text",
    restricted_role_ids: c.restrictedRoleIds ?? [], archived: c.archived ?? false,
    position: c.position ?? 0, created_by: c.createdBy ?? null, geo_locations: c.geoLocations ?? null,
    geo_radius_miles: c.geoRadiusMiles ?? null, is_geo_channel: c.isGeoChannel ?? false,
    created_at: msToIso(c.createdAt),
  };
}
function rowRole(r) {
  return {
    id: r.id, name: r.name ?? "", color: r.color ?? "#888888", priority: r.priority ?? 0,
    permissions: r.permissions ?? [], system: r.system ?? false,
  };
}

/* ---------------- Run ---------------- */
const report = {};
async function main() {
  TOKEN = await getAccessToken();
  console.log("admin token minted ✓");

  // users
  const users = await fsList("users");
  report.users = await upsert("users", users.map((u) => rowUser(u.id, u.data)));

  // messages (channel chat)
  const messages = await fsList("messages");
  report.messages = await upsert("messages", messages.map((m) => rowMessage(m.id, m.data)));

  // conversations + their messages subcollection
  const convs = await fsList("conversations");
  report.conversations = await upsert("conversations", convs.map((c) => rowConversation(c.id, c.data)));
  let convMsgs = [];
  for (const c of convs) {
    const sub = await fsList(`conversations/${c.id}/messages`);
    convMsgs = convMsgs.concat(sub.map((m) => rowConvMessage(m.id, c.id, m.data)));
  }
  report.conversation_messages = await upsert("conversation_messages", convMsgs);

  // friendships
  const friends = await fsList("friendships");
  report.friendships = await upsert("friendships", friends.map((f) => rowFriendship(f.id, f.data)));

  // events + comments subcollection
  const events = await fsList("events");
  report.events = await upsert("events", events.map((e) => rowEvent(e.id, e.data)));
  let comments = [];
  for (const e of events) {
    const sub = await fsList(`events/${e.id}/comments`);
    comments = comments.concat(sub.map((c) => rowEventComment(c.id, e.id, c.data)));
  }
  report.event_comments = await upsert("event_comments", comments);

  // calendarSyncConfigs
  const syncs = await fsList("calendarSyncConfigs");
  report.calendar_sync_configs = await upsert("calendar_sync_configs", syncs.map((s) => rowSyncConfig(s.id, s.data)));

  // config singletons -> relational tables
  const rolesDoc = await fsGet("config/roles");
  if (rolesDoc?.roles) report.roles = await upsert("roles", rolesDoc.roles.map(rowRole));

  const channelsDoc = await fsGet("config/channels");
  if (channelsDoc?.channels) report.channels = await upsert("channels", channelsDoc.channels.map(rowChannel));

  const userRolesDoc = await fsGet("config/userRoles");
  const map = userRolesDoc?.map ?? userRolesDoc?.userRoles ?? {};
  const urRows = [];
  for (const uid of Object.keys(map)) {
    for (const rid of map[uid] || []) urRows.push({ user_id: uid, role_id: rid });
  }
  report.user_roles = await upsert("user_roles", urRows);

  console.log("\n=== MIGRATION COMPLETE ===");
  for (const k of Object.keys(report)) console.log(`${k.padEnd(24)} ${report[k]} rows`);
}

main().catch((e) => { console.error("MIGRATION FAILED:", e.message); process.exit(1); });
