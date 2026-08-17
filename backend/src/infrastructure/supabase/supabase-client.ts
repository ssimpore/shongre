import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../generated/database.types.js';

let anonClientInstance: SupabaseClient<Database> | null = null;
let adminClientInstance: SupabaseClient<Database> | null = null;

export function getSupabaseAnonClient(): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return createClient<Database>(
      url || 'http://127.0.0.1:54321',
      anonKey || 'dummy-anon-key'
    );
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
    return createClient<Database>(
      url || 'http://127.0.0.1:54321',
      serviceRoleKey || 'dummy-service-role-key',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
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
