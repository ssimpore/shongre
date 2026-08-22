import { createHash } from 'node:crypto';
import { BASELINE_MONETIZATION_CATALOG } from '@shongre/contracts/monetization-catalog';
import { monetizationCatalogSchema } from '@shongre/contracts/monetization';
import { getSupabaseAdminClient } from '../../src/infrastructure/supabase/supabase-client.js';

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
}

async function importBaseline() {
  const catalog = monetizationCatalogSchema.parse(BASELINE_MONETIZATION_CATALOG);
  const hash = createHash('sha256')
    .update(JSON.stringify(stableValue(catalog)))
    .digest('hex');
  const client = getSupabaseAdminClient() as any;
  const { error } = await client.rpc('import_commercial_catalog', {
    p_catalog: catalog,
    p_snapshot_hash: hash,
    p_reason: 'Backfill initial du catalogue commercial audité',
  });
  if (error) throw error;
  console.log(
    `Imported commercial catalog ${catalog.configurationVersionId}: ` +
      `${catalog.products.length} products, ${catalog.rules.length} rules, sha256 ${hash}.`,
  );
}

importBaseline().catch((error) => {
  console.error('Commercial catalog import failed:', error);
  process.exitCode = 1;
});

