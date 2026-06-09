// Copy Firebase Storage objects referenced in migrated rows into the
// Supabase `media` bucket, then rewrite the rows to point at the new
// public Supabase URLs. Idempotent: already-migrated (supabase.co) URLs
// are skipped.
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

async function patch(table, id, body) {
  await fetch(`${REST}/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
}

async function main() {
  // users: avatar, cover_photo, gallery_photos[]
  const users = await (
    await fetch(`${REST}/users?select=id,avatar,cover_photo,gallery_photos`, { headers: H })
  ).json();
  for (const u of users) {
    const body = {};
    if (u.avatar?.includes("firebasestorage")) body.avatar = await copyOne(u.avatar);
    if (u.cover_photo?.includes("firebasestorage")) body.cover_photo = await copyOne(u.cover_photo);
    if (Array.isArray(u.gallery_photos) && u.gallery_photos.some((g) => g?.includes("firebasestorage"))) {
      body.gallery_photos = [];
      for (const g of u.gallery_photos) body.gallery_photos.push(await copyOne(g));
    }
    if (Object.keys(body).length) {
      await patch("users", u.id, body);
      console.log("patched user", u.id);
    }
  }

  // messages: post_media[] ({url,type,...})
  const msgs = await (
    await fetch(`${REST}/messages?select=id,post_media&post_media=not.is.null`, { headers: H })
  ).json();
  for (const m of msgs) {
    if (!Array.isArray(m.post_media)) continue;
    if (!m.post_media.some((pm) => pm?.url?.includes("firebasestorage"))) continue;
    const next = [];
    for (const pm of m.post_media) {
      next.push({ ...pm, url: await copyOne(pm.url) });
    }
    await patch("messages", m.id, { post_media: next });
    console.log("patched message", m.id);
  }

  console.log(`\nstorage migration complete — ${copied} object(s) copied`);
}

main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
