import "dotenv/config";
import { getSupabaseAdminClient } from "../../src/infrastructure/supabase/supabase-client.js";

const client = getSupabaseAdminClient() as any;
const { data, error } = await client.rpc("unified_discovery_migration_dry_run");
if (error) {
  throw new Error(`Unified discovery dry-run failed: ${error.message}`);
}
process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
