import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../generated/database.types.js";
import { config } from "../../app/config/index.js";

let anonClientInstance: SupabaseClient<Database> | null = null;
let adminClientInstance: SupabaseClient<Database> | null = null;

export function getSupabaseAnonClient(): SupabaseClient<Database> {
  const url = config.supabaseUrl;
  const anonKey = config.supabaseAnonKey;

  if (!url || !anonKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_ANON_KEY are required when a Supabase client is used.",
    );
  }

  if (!anonClientInstance) {
    anonClientInstance = createClient<Database>(url, anonKey);
  }
  return anonClientInstance;
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
    });
  }
  return adminClientInstance;
}
