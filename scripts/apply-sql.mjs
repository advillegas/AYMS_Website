import fs from "fs";
const TOKEN = process.env.SUPABASE_PAT;
const REF = process.env.SUPABASE_REF;
const sql = process.argv[3] ?? fs.readFileSync(process.argv[2], "utf8");
const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql }),
});
console.log("status:", res.status);
console.log((await res.text()).slice(0, 4000));
