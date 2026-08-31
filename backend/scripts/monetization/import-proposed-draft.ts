import { createHash } from "node:crypto";
import { PROPOSED_MONETIZATION_DRAFT_CATALOG } from "@shongre/contracts/monetization-proposed-catalog";
import { monetizationCatalogSchema } from "@shongre/contracts/monetization";
import { validateCommercialConfiguration } from "../../src/modules/business-rules/configuration-validator.js";
import { getSupabaseAdminClient } from "../../src/infrastructure/supabase/supabase-client.js";

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
}

async function importProposedDraft() {
  if (process.env.APP_ENV === "production") {
    throw new Error(
      "The proposed commercial draft cannot be seeded directly in production.",
    );
  }
  const catalog = monetizationCatalogSchema.parse(
    PROPOSED_MONETIZATION_DRAFT_CATALOG,
  );
  const conflicts = validateCommercialConfiguration(catalog);
  const snapshotHash = createHash("sha256")
    .update(JSON.stringify(stableValue(catalog)))
    .digest("hex");
  const version = {
    id: catalog.configurationVersionId,
    setId: "commercial-core",
    versionNumber: catalog.versionNumber,
    marketCode: catalog.marketCode,
    status: "draft",
    reason:
      "Brouillon cible Starter, Growth et Performance avec migration et garde-fous",
    createdBy: "",
    createdAt: catalog.generatedAt,
    productCount: catalog.products.length,
    ruleCount:
      catalog.rules.length +
      catalog.commissionPolicies.reduce(
        (count, policy) => count + policy.rules.length,
        0,
      ),
    conflicts,
  };
  const client = getSupabaseAdminClient() as any;
  const { error } = await client.rpc("save_commercial_configuration_version", {
    p_version: version,
    p_catalog: catalog,
    p_snapshot_hash: snapshotHash,
  });
  if (error) throw error;
  console.log(
    `Imported draft ${catalog.configurationVersionId}: ${catalog.products.length} products, ` +
      `${conflicts.filter((entry) => entry.severity === "blocking").length} publication blockers, ` +
      `sha256 ${snapshotHash}.`,
  );
}

importProposedDraft().catch((error) => {
  console.error("Proposed commercial draft import failed:", error);
  process.exitCode = 1;
});
