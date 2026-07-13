/**
 * Probe (and optionally clean) the live Supabase `events` table.
 *
 * Read-only by default: prints event ids/titles/sources/dates and whether
 * the events-suppression.sql objects (calendar_sync_configs.suppressed_uids)
 * exist. Never prints secrets.
 *
 *   node scripts/probe-events.mjs                 # read-only probe (anon)
 *   node scripts/probe-events.mjs --admin         # sign in with ADMIN_PASSWORD
 *                                                 # (same flow as the site's
 *                                                 # /api/auth/admin-session) to
 *                                                 # read RLS-gated tables
 *   node scripts/probe-events.mjs --admin --delete-junk
 *                                                 # also delete rows whose
 *                                                 # trimmed lowercase title is
 *                                                 # exactly "qwerty" or "qwert"
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(url, anonKey, { auth: { persistSession: false } });
const deleteJunk = process.argv.includes("--delete-junk");
const asAdmin = process.argv.includes("--admin");

/** Same identity the live site's password-admin uses (admin-session route). */
const ADMIN_EMAIL = "admin@amigasymassocial.com";

async function signInAdmin() {
  const password = env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!password) {
    console.error("--admin requested but no ADMIN_PASSWORD in .env.local");
    process.exit(1);
  }
  const { data, error } = await sb.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password,
  });
  if (error || !data.session) {
    console.error("admin sign-in FAILED:", error?.message ?? "no session");
    process.exit(1);
  }
  console.log(`signed in as admin (${ADMIN_EMAIL}) — RLS-gated tables now visible\n`);
}

/** Titles that are unambiguous test junk (case-insensitive, trimmed). */
const JUNK_TITLES = new Set(["qwerty", "qwert"]);
/** Titles worth flagging in the report but NOT auto-deleting. */
const SUSPICIOUS = /^(test|testing|asdf+|aaa+|xxx+|zzz+|foo|bar|baz|qwe|abc|123+|\.+)$/i;

function fmt(v) {
  return v === null || v === undefined || v === "" ? "-" : String(v);
}

async function main() {
  if (asAdmin) {
    await signInAdmin();
    console.log("== admin identity diagnostics ==");
    const { data: rpcAdmin, error: rpcAdminErr } = await sb.rpc("is_app_admin");
    console.log(
      rpcAdminErr
        ? `is_app_admin() rpc failed: ${rpcAdminErr.message}`
        : `is_app_admin() = ${rpcAdmin}`,
    );
    const { data: rpcUid, error: rpcUidErr } = await sb.rpc("current_app_user_id");
    console.log(
      rpcUidErr
        ? `current_app_user_id() rpc failed: ${rpcUidErr.message}`
        : `current_app_user_id() = ${JSON.stringify(rpcUid)}`,
    );
    const { data: adminRows, error: adminErr } = await sb
      .from("users")
      .select("id, email, role, auth_id")
      .ilike("email", ADMIN_EMAIL);
    if (adminErr) console.log(`users lookup failed: ${adminErr.message}`);
    else
      for (const u of adminRows ?? [])
        console.log(
          `  users row: id=${fmt(u.id)} role=${fmt(u.role)} auth_id=${u.auth_id ? "linked" : "null"}`,
        );
    console.log("");
  }
  console.log("== live events table ==");
  const { data: events, error: evErr } = await sb
    .from("events")
    .select("id, title, type, date, end_date, published, source_calendar_id, source_uid, created_by, created_at")
    .limit(1000);
  if (evErr) {
    console.error("events query FAILED:", evErr.message);
    process.exit(1);
  }
  const rows = (events ?? []).sort((a, b) => String(a.date ?? "").localeCompare(String(b.date ?? "")));
  console.log(`total rows: ${rows.length}`);
  for (const r of rows) {
    const source = r.source_calendar_id
      ? `synced(feed=${r.source_calendar_id})`
      : r.created_by
        ? `manual(by=${r.created_by})`
        : "manual(no creator — likely seed/test)";
    console.log(
      `  [${fmt(r.id)}] title=${JSON.stringify(r.title ?? "")} type=${fmt(r.type)} date=${fmt(r.date)} published=${fmt(r.published)} source=${source} created_at=${fmt(r.created_at)}`,
    );
  }

  const junk = rows.filter((r) => JUNK_TITLES.has(String(r.title ?? "").trim().toLowerCase()));
  const suspicious = rows.filter(
    (r) =>
      !JUNK_TITLES.has(String(r.title ?? "").trim().toLowerCase()) &&
      SUSPICIOUS.test(String(r.title ?? "").trim()),
  );

  console.log("\n== junk detection ==");
  console.log(`exact junk (qwerty/qwert): ${junk.length}`);
  for (const r of junk) console.log(`  DELETE-CANDIDATE [${r.id}] ${JSON.stringify(r.title)}`);
  console.log(`suspicious (flag only, NOT deleted): ${suspicious.length}`);
  for (const r of suspicious) console.log(`  SUSPICIOUS [${r.id}] ${JSON.stringify(r.title)}`);

  console.log("\n== live meetups table (merged into /events feed) ==");
  const { data: meetups, error: muErr } = await sb
    .from("meetups")
    .select("id, title, date, host_id, host_name, created_at")
    .limit(1000);
  if (muErr) {
    console.log(`meetups query failed: ${muErr.message}`);
  } else {
    console.log(`total rows: ${(meetups ?? []).length}`);
    for (const m of meetups ?? []) {
      console.log(
        `  [${fmt(m.id)}] title=${JSON.stringify(m.title ?? "")} date=${fmt(m.date)} host=${fmt(m.host_name)}(${fmt(m.host_id)}) created_at=${fmt(m.created_at)}`,
      );
    }
    const junkMeetups = (meetups ?? []).filter((m) =>
      JUNK_TITLES.has(String(m.title ?? "").trim().toLowerCase()),
    );
    console.log(`exact junk meetups (qwerty/qwert): ${junkMeetups.length}`);
    for (const m of junkMeetups) console.log(`  DELETE-CANDIDATE meetup [${m.id}] ${JSON.stringify(m.title)}`);
  }

  console.log("\n== legacy Firestore events collection (read-only REST) ==");
  const fbProject = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
  if (!fbProject) {
    console.log("no NEXT_PUBLIC_FIREBASE_PROJECT_ID — skipped");
  } else {
    try {
      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/${fbProject}/databases/(default)/documents/events?pageSize=300`,
      );
      if (!res.ok) {
        console.log(`Firestore REST list failed: HTTP ${res.status}`);
      } else {
        const data = await res.json();
        const docs = data.documents ?? [];
        console.log(`total docs: ${docs.length}`);
        for (const d of docs) {
          const id = d.name.split("/").pop();
          const title = d.fields?.title?.stringValue ?? "";
          const date = d.fields?.date?.stringValue ?? "";
          console.log(`  [${id}] title=${JSON.stringify(title)} date=${fmt(date)}`);
        }
      }
    } catch (err) {
      console.log(`Firestore REST list errored: ${err?.message ?? err}`);
    }
  }

  console.log("\n== calendar_sync_configs / suppression objects ==");
  const { data: cfgAll, error: cfgErr } = await sb
    .from("calendar_sync_configs")
    .select("*")
    .limit(50);
  if (cfgErr) {
    console.log(`configs query failed (RLS may hide them from anon): ${cfgErr.message}`);
  } else {
    console.log(`config rows visible to anon: ${(cfgAll ?? []).length}`);
    for (const c of cfgAll ?? []) {
      console.log(
        `  [${fmt(c.id)}] name=${JSON.stringify(c.name ?? "")} enabled=${fmt(c.enabled)} suppressed_uids=${"suppressed_uids" in c ? JSON.stringify(c.suppressed_uids) : "<column missing>"}`,
      );
    }
    if ((cfgAll ?? []).length > 0) {
      const hasCol = "suppressed_uids" in cfgAll[0];
      console.log(`suppressed_uids column present: ${hasCol}`);
    }
  }
  // Column existence check that works even with zero rows: select the column
  // explicitly — Postgres errors with 42703 if it doesn't exist.
  const { error: colErr } = await sb
    .from("calendar_sync_configs")
    .select("suppressed_uids")
    .limit(1);
  console.log(
    colErr
      ? `explicit suppressed_uids select failed: ${colErr.code ?? ""} ${colErr.message} → suppression SQL ${colErr.code === "42703" ? "NOT applied" : "state unknown (query blocked)"}`
      : "explicit suppressed_uids select OK → suppression SQL applied",
  );

  if (deleteJunk) {
    console.log("\n== deleting junk rows ==");
    const junkMeetups = (meetups ?? []).filter((m) =>
      JUNK_TITLES.has(String(m.title ?? "").trim().toLowerCase()),
    );
    if (junk.length === 0 && junkMeetups.length === 0) {
      console.log("nothing to delete.");
    }
    for (const r of junk) {
      const { data: delData, error: delErr } = await sb
        .from("events")
        .delete()
        .eq("id", r.id)
        .select("id");
      if (delErr || !delData || delData.length === 0)
        console.log(`  FAILED to delete event [${r.id}] ${JSON.stringify(r.title)}: ${delErr?.message ?? "0 rows (RLS?)"}`);
      else console.log(`  DELETED event [${r.id}] ${JSON.stringify(r.title)}`);
    }
    for (const m of junkMeetups) {
      const { data: delData, error: delErr } = await sb
        .from("meetups")
        .delete()
        .eq("id", m.id)
        .select("id");
      if (delErr || !delData || delData.length === 0)
        console.log(`  FAILED to delete meetup [${m.id}] ${JSON.stringify(m.title)}: ${delErr?.message ?? "0 rows (RLS?)"}`);
      else console.log(`  DELETED meetup [${m.id}] ${JSON.stringify(m.title)}`);
    }
    const { data: afterEv } = await sb.from("events").select("id, title").limit(1000);
    const { data: afterMu } = await sb.from("meetups").select("id, title").limit(1000);
    const remaining = [...(afterEv ?? []), ...(afterMu ?? [])].filter((r) =>
      JUNK_TITLES.has(String(r.title ?? "").trim().toLowerCase()),
    );
    console.log(`junk rows remaining after delete: ${remaining.length}`);
  }
}

main().catch((err) => {
  console.error("probe failed:", err);
  process.exit(1);
});
