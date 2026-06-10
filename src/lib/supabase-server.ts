/**
 * Server-only Supabase clients for Route Handlers.
 *
 * SUPABASE_SERVICE_ROLE_KEY bypasses RLS — it must NEVER be exposed as
 * NEXT_PUBLIC_* and this module must never be imported from a
 * "use client" file. The anon server client is for public reads (RLS
 * still applies) without dragging in the browser client's persisted
 * session machinery.
 */

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let serviceClient: SupabaseClient | null = null;

/** Service-role client (bypasses RLS). Null when env is missing. */
export function getServiceClient(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  if (serviceClient) return serviceClient;
  serviceClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serviceClient;
}

let anonServerClient: SupabaseClient | null = null;

/** Anon-key client for server-side public reads (RLS enforced). */
export function getAnonServerClient(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (anonServerClient) return anonServerClient;
  anonServerClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return anonServerClient;
}
