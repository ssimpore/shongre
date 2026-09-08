import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import { monetizationCatalogSchema } from "@shongre/contracts/monetization";
import { getSupabaseAdminClient } from "../../src/infrastructure/supabase/supabase-client.js";

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
}

export async function importBaselineCommercialCatalog({
  onlyIfMissing = false,
}: { onlyIfMissing?: boolean } = {}) {
  const catalog = monetizationCatalogSchema.parse(
    BASELINE_MONETIZATION_CATALOG,
  );
  const hash = createHash("sha256")
    .update(JSON.stringify(stableValue(catalog)))
    .digest("hex");
  const client = getSupabaseAdminClient();
  if (onlyIfMissing) {
    const { data, error } = await client
      .from("commercial_configuration_versions")
      .select("id")
      .eq("rule_set_id", "commercial-core")
      .eq("market_code", catalog.marketCode)
      .limit(1);
    if (error) throw error;
    if (data?.length) {
      console.log("Preserved the database-owned commercial catalogue.");
      return;
    }
  }
  const { error } = await client.rpc("install_commercial_catalog_release", {
    p_catalog: catalog,
    p_snapshot_hash: hash,
    p_reason: "Publication du catalogue professionnel verticalisé v2",
  });
  if (error) throw error;
  console.log(
    `Imported commercial catalog ${catalog.configurationVersionId}: ` +
      `${catalog.products.length} products, ${catalog.rules.length} rules, sha256 ${hash}.`,
  );
}

const isDirectExecution =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectExecution) {
  importBaselineCommercialCatalog().catch((error) => {
    console.error("Commercial catalog import failed:", error);
    process.exitCode = 1;
  });
}
