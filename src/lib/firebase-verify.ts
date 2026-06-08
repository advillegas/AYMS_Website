/**
 * Server-side Firebase ID-token verification using Google's Identity
 * Toolkit REST API. This avoids needing the Firebase Admin SDK (and its
 * service-account credentials) while still cryptographically validating
 * the token: Google checks the signature, audience and expiry and returns
 * the canonical uid.
 *
 * Intended for Route Handlers only — it reads server env and calls Google.
 */

const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

/** True when Firebase auth is configured (so tokens can be required + verified). */
export const FIREBASE_AUTH_ENABLED = Boolean(
  firebaseApiKey && firebaseProjectId,
);

/** Verify an ID token; returns the uid, or null when missing/invalid. */
export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<string | null> {
  if (!firebaseApiKey) return null;
  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      },
    );
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      users?: Array<{ localId?: string }>;
    };
    return data.users?.[0]?.localId ?? null;
  } catch (err) {
    console.error("[firebase-verify] id-token verification failed", err);
    return null;
  }
}

/** Extract a Bearer token from the Authorization header, or null. */
export function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}
