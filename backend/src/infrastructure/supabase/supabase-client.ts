import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../generated/database.types.js';

let anonClientInstance: SupabaseClient<Database> | null = null;
let adminClientInstance: SupabaseClient<Database> | null = null;

export function getSupabaseAnonClient(): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required when a Supabase client is used.');
  }

  if (!anonClientInstance) {
    anonClientInstance = createClient<Database>(url, anonKey);
  }
  return anonClientInstance;
}

export function getSupabaseAdminClient(): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when the admin client is used.');
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
