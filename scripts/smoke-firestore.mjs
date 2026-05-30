/**
 * One-shot Firestore connectivity smoke test.
 *
 * Writes one doc to /messages, reads the channel back, deletes the
 * test doc. If anything fails, prints the precise Firebase error so
 * we know whether to fix env vars, security rules, or enable
 * Firestore in the console.
 *
 * Run with:  node scripts/smoke-firestore.mjs
 */

import { config } from "dotenv";
import { initializeApp } from "firebase/app";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

config({ path: ".env.local" });

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const missing = Object.entries(cfg).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`Project: ${cfg.projectId}`);

const app = initializeApp(cfg);
const db = getFirestore(app);

const TEST_CHANNEL = "smoke-test";
const TEST_TEXT = `smoke-test-${Date.now()}`;

try {
  console.log("Writing test message...");
  const docRef = await addDoc(collection(db, "messages"), {
    channelId: TEST_CHANNEL,
    userId: "smoke",
    userName: "Smoke Tester",
    userAvatar: "",
    content: TEST_TEXT,
    attachments: [],
    createdAt: serverTimestamp(),
  });
  console.log(`  -> wrote doc ${docRef.id}`);

  console.log("Reading channel back...");
  const q = query(
    collection(db, "messages"),
    where("channelId", "==", TEST_CHANNEL),
    orderBy("createdAt", "asc"),
    limit(10),
  );
  const snap = await getDocs(q);
  console.log(`  -> read ${snap.size} doc(s)`);
  snap.forEach((d) => {
    const data = d.data();
    console.log(`     - ${d.id}: ${data.content}`);
  });

  console.log("Cleaning up test doc...");
  await deleteDoc(doc(db, "messages", docRef.id));
  console.log("  -> deleted");

  console.log("");
  console.log("OK - Firestore is fully wired up.");
  process.exit(0);
} catch (err) {
  console.error("");
  console.error("FAILED:", err.code ?? err.name);
  console.error(err.message);
  if (err.code === "permission-denied") {
    console.error(
      "\nFix: in the Firebase console, open Firestore -> Rules tab and confirm",
      "you started in Test mode. Test mode rules look like:\n",
      "  allow read, write: if request.time < timestamp.date(2026, 5, 28);",
    );
  } else if (err.code === "unavailable" || /not.*found/i.test(err.message)) {
    console.error(
      "\nFix: Firestore Database is not enabled for this project.",
      "Open the Firebase console -> Databases & Storage -> Firestore -> Create database.",
    );
  }
  process.exit(1);
}
