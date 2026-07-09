import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses Row Level Security.
 *
 * SERVER-ONLY. The `server-only` import above makes any accidental
 * import of this module from client code fail the build. Never pass
 * this client, or the service-role key, to a Client Component or a
 * response body.
 *
 * Every server action / route handler that uses this client MUST call
 * `requireSession()` (see lib/auth/session.ts) first.
 */

function getSupabaseConfig(): { url: string; serviceRoleKey: string } {
  const isDev = process.env.APP_ENV === "development";

  const url = isDev
    ? process.env.DEV_SUPABASE_URL
    : process.env.PROD_SUPABASE_URL;
  const serviceRoleKey = isDev
    ? process.env.DEV_SUPABASE_SERVICE_ROLE_KEY
    : process.env.PROD_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    const prefix = isDev ? "DEV_" : "PROD_";
    throw new Error(
      `Missing Supabase config: ${prefix}SUPABASE_URL / ${prefix}SUPABASE_SERVICE_ROLE_KEY. ` +
        `Check APP_ENV and your .env file.`,
    );
  }

  return { url, serviceRoleKey };
}

let cachedClient: SupabaseClient | null = null;

/**
 * Returns a singleton service-role Supabase client for the current process.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const { url, serviceRoleKey } = getSupabaseConfig();

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}
