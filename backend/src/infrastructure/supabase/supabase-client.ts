import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../generated/database.types.js";
import { config } from "../../app/config/index.js";

let anonClientInstance: SupabaseClient<Database> | null = null;
let adminClientInstance: SupabaseClient<Database> | null = null;

const fetchWithDatabaseTimeout: typeof fetch = (input, init = {}) => {
  const timeout = AbortSignal.timeout(
    config.performance.databaseRequestTimeoutMs,
  );
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeout])
    : timeout;
  return fetch(input, { ...init, signal });
};

export function getSupabaseAnonClient(): SupabaseClient<Database> {
  const url = config.supabaseUrl;
  const anonKey = config.supabaseAnonKey;

  if (!url || !anonKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_ANON_KEY are required when a Supabase client is used.",
    );
  }

  if (!anonClientInstance) {
    anonClientInstance = createClient<Database>(url, anonKey, {
      global: { fetch: fetchWithDatabaseTimeout },
    });
  }
  return anonClientInstance;
}

/**
 * Returns an isolated, non-persisting Auth client for one credential check.
 *
 * A singleton Auth client would retain the last signed-in Supabase session in
 * memory and could mix identities across concurrent backend requests. Shongre
 * owns its application sessions, so the Supabase session is deliberately
 * discarded with this client after the password has been verified.
 */
export function createSupabasePasswordAuthClient(): SupabaseClient<Database> {
  const url = config.supabaseUrl;
  const anonKey = config.supabaseAnonKey;

  if (!url || !anonKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_ANON_KEY are required when password authentication is used.",
    );
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: { fetch: fetchWithDatabaseTimeout },
  });
}

export function getSupabaseAdminClient(): SupabaseClient<Database> {
  const url = config.supabaseUrl;
  const serviceRoleKey = config.supabaseServiceRoleKey;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when the admin client is used.",
    );
  }

  if (!adminClientInstance) {
    adminClientInstance = createClient<Database>(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: { fetch: fetchWithDatabaseTimeout },
    });
  }
  return adminClientInstance;
}
