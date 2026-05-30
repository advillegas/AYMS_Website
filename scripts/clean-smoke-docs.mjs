/**
 * Cleans up any leftover docs in the smoke-test channel.
 * Safe to run anytime - only touches /messages where channelId == "smoke-test".
 */

import { config } from "dotenv";
import { initializeApp } from "firebase/app";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
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

const app = initializeApp(cfg);
const db = getFirestore(app);

const snap = await getDocs(
  query(collection(db, "messages"), where("channelId", "==", "smoke-test")),
);
console.log(`Found ${snap.size} smoke-test doc(s)`);
for (const d of snap.docs) {
  await deleteDoc(doc(db, "messages", d.id));
  console.log(`  deleted ${d.id}`);
}
console.log("done");
process.exit(0);
