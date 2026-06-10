// Copy Firebase Storage objects referenced in migrated rows into the
// Supabase `media` bucket, then rewrite the rows to point at the new
// public Supabase URLs. Idempotent: already-migrated (supabase.co) URLs
// are skipped, and rows are only patched when they still hold a
// firebasestorage URL, so re-running is safe.
//
// Env: SB_URL, SB_SERVICE (service-role key)

const URL = process.env.SB_URL;
const SVC = process.env.SB_SERVICE;
const REST = `${URL}/rest/v1`;
const STORAGE = `${URL}/storage/v1`;
const H = { apikey: SVC, Authorization: `Bearer ${SVC}` };

let copied = 0;
const cache = new Map(); // firebaseUrl -> supabaseUrl

async function copyOne(srcUrl) {
  if (!srcUrl || !srcUrl.includes("firebasestorage")) return srcUrl;
  if (cache.has(srcUrl)) return cache.get(srcUrl);
  const res = await fetch(srcUrl);
  if (!res.ok) {
    console.warn("  ! download failed", res.status, srcUrl.slice(0, 80));
    return srcUrl;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type") || "application/octet-stream";
  const ext = ct.split("/")[1]?.split(";")[0] || "bin";
  const path = `migrated/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const up = await fetch(`${STORAGE}/object/media/${path}`, {
    method: "POST",
    headers: { ...H, "Content-Type": ct },
    body: buf,
  });
  if (!up.ok) {
    console.warn("  ! upload failed", up.status, await up.text());
    return srcUrl;
  }
  const publicUrl = `${STORAGE}/object/public/media/${path}`;
  cache.set(srcUrl, publicUrl);
  copied++;
  console.log("  ✓ copied", srcUrl.slice(0, 60), "->", path);
  return publicUrl;
}

/** True when the value (string or jsonb) embeds a Firebase Storage URL. */
const hasFb = (v) => v != null && JSON.stringify(v).includes("firebasestorage");

/** Recursively rewrite every firebasestorage URL inside a string/array/object. */
async function rewriteDeep(v) {
  if (typeof v === "string") return hasFb(v) ? copyOne(v) : v;
  if (Array.isArray(v)) {
    const out = [];
    for (const x of v) out.push(await rewriteDeep(x));
    return out;
  }
  if (v && typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v)) out[k] = await rewriteDeep(v[k]);
    return out;
  }
  return v;
}

/** Page through every row of a PostgREST query (default max-rows is 1000). */
const PAGE = 1000;
async function fetchAll(query) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${REST}/${query}`, {
      headers: { ...H, Range: `${from}-${from + PAGE - 1}` },
    });
    if (!res.ok) throw new Error(`fetch ${query} -> ${res.status} ${await res.text()}`);
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

/**
 * Rewrite the given columns (scalar string or jsonb) on every row of a
 * table. keyCols defaults to ["id"]; pass the composite key for tables
 * without an id column (rsvps).
 */
async function rewriteTable(table, columns, keyCols = ["id"]) {
  const select = [...keyCols, ...columns].join(",");
  const order = keyCols.map((k) => `${k}.asc`).join(",");
  const rows = await fetchAll(`${table}?select=${select}&order=${order}`);
  for (const r of rows) {
    const body = {};
    for (const c of columns) {
      if (hasFb(r[c])) body[c] = await rewriteDeep(r[c]);
    }
    if (!Object.keys(body).length) continue;
    const qs = keyCols.map((k) => `${k}=eq.${encodeURIComponent(r[k])}`).join("&");
    const res = await fetch(`${REST}/${table}?${qs}`, {
      method: "PATCH",
      headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.warn(`  ! patch ${table} failed`, res.status, await res.text());
    else console.log(`patched ${table}`, keyCols.map((k) => r[k]).join("/"));
  }
}

async function main() {
  await rewriteTable("users", ["avatar", "cover_photo", "gallery_photos"]);
  await rewriteTable("messages", ["user_avatar", "attachments", "post_media"]);
  await rewriteTable("conversation_messages", ["user_avatar", "attachments"]);
  await rewriteTable("conversations", ["last_message"]);
  await rewriteTable("events", ["image"]);
  await rewriteTable("trips", ["image"]);
  await rewriteTable("event_comments", ["user_avatar"]);
  await rewriteTable("meetups", ["host_avatar"]);
  await rewriteTable("rsvps", ["user_avatar"], ["target_type", "target_id", "user_id"]);
  await rewriteTable("trip_reservations", ["user_avatar"]);
  await rewriteTable("notifications", ["actor_avatar"]);

  console.log(`\nstorage migration complete — ${copied} object(s) copied`);
}

main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
