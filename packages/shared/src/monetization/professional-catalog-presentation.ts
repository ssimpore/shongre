import type {
  CommercialConfigurationVersion,
  MonetizationCatalog,
  MonetizationProduct,
  ProfessionalCatalogPresentation,
  ProfessionalCatalogSnapshot,
} from "@shongre/contracts/monetization";
import {
  professionalCatalogPresentationSchema,
  professionalCatalogSnapshotSchema,
} from "@shongre/contracts/monetization";

export interface VersionedCommercialCatalog {
  version: CommercialConfigurationVersion;
  catalog: MonetizationCatalog;
}

const PREVIEWABLE_VERSION_STATUSES = new Set<
  CommercialConfigurationVersion["status"]
>(["draft", "pending_approval", "approved", "scheduled"]);

const ADDON_KINDS = new Set<MonetizationProduct["kind"]>([
  "premium_option",
  "sponsored_placement",
  "pack",
  "credit_pack",
]);

const isProfessionalPlan = (product: MonetizationProduct) =>
  product.kind === "subscription" &&
  product.commercialProfile.professionalOnly &&
  Boolean(product.commercialProfile.tier);

const isPresentableAddon = (product: MonetizationProduct) =>
  ADDON_KINDS.has(product.kind) &&
  !["disabled", "archived"].includes(product.status) &&
  product.prices.some((price) => price.amount.amountMinor > 0);

function publicSnapshot(
  catalog: MonetizationCatalog,
  productIds: string[],
): ProfessionalCatalogSnapshot {
  const visibleProductIds = new Set(productIds);
  const campaigns = catalog.campaigns.filter((campaign) =>
    campaign.productIds.some((productId) => visibleProductIds.has(productId)),
  );
  const priceProtectionPolicyIds = new Set(
    campaigns.flatMap((campaign) =>
      campaign.priceProtectionPolicyId
        ? [campaign.priceProtectionPolicyId]
        : [],
    ),
  );

  return professionalCatalogSnapshotSchema.parse({
    configurationVersionId: catalog.configurationVersionId,
    versionNumber: catalog.versionNumber,
    marketCode: catalog.marketCode,
    currency: catalog.currency,
    generatedAt: catalog.generatedAt,
    verticals: catalog.verticals,
    products: catalog.products.filter((product) =>
      visibleProductIds.has(product.id),
    ),
    priceProtectionPolicies: catalog.priceProtectionPolicies.filter((policy) =>
      priceProtectionPolicyIds.has(policy.id),
    ),
    campaigns,
    stale: catalog.stale,
  });
}

function activePresentation(
  catalog: MonetizationCatalog,
  predecessor?: MonetizationCatalog,
): ProfessionalCatalogPresentation {
  const migrationTargets = new Set(
    catalog.migrationMappings
      .filter((mapping) => mapping.treatment !== "no_replacement")
      .map((mapping) => mapping.toProductId),
  );
  const activePlans = catalog.products.filter(
    (product) => product.status === "active" && isProfessionalPlan(product),
  );
  const activeMigrationTargets = activePlans.filter((product) =>
    migrationTargets.has(product.id),
  );
  const presentedPlans =
    migrationTargets.size > 0 ? activeMigrationTargets : activePlans;
  const predecessorProductIds = new Set(
    predecessor?.products.map((product) => product.id) || [],
  );
  const presentedAddons = catalog.products.filter(
    (product) =>
      product.status === "active" &&
      isPresentableAddon(product) &&
      (migrationTargets.size === 0 ||
        predecessorProductIds.size === 0 ||
        !predecessorProductIds.has(product.id)),
  );
  const planProductIds = presentedPlans.map((product) => product.id);
  const addonProductIds = presentedAddons.map((product) => product.id);

  return professionalCatalogPresentationSchema.parse({
    catalog: publicSnapshot(catalog, [...planProductIds, ...addonProductIds]),
    mode: "active",
    checkoutEnabled: planProductIds.length > 0,
    planProductIds,
    addonProductIds,
  });
}

/**
 * Selects the one public professional-catalogue projection used by backend and
 * deterministic clients. A newer migration target can be previewed without
 * replacing the active catalogue used for quotes and historical subscriptions.
 */
export function selectProfessionalCatalogPresentation(
  activeCatalog: MonetizationCatalog,
  candidates: VersionedCommercialCatalog[],
): ProfessionalCatalogPresentation {
  const activeProductIds = new Set(
    activeCatalog.products.map((product) => product.id),
  );
  const preview = [...candidates]
    .filter(
      ({ version, catalog }) =>
        version.marketCode === activeCatalog.marketCode &&
        version.versionNumber > activeCatalog.versionNumber &&
        PREVIEWABLE_VERSION_STATUSES.has(version.status) &&
        catalog.configurationVersionId === version.id,
    )
    .sort(
      (left, right) => right.version.versionNumber - left.version.versionNumber,
    )
    .map(({ catalog }) => {
      const introducedProducts = catalog.products.filter(
        (product) => !activeProductIds.has(product.id),
      );
      const migrationTargets = new Set(
        catalog.migrationMappings.map((mapping) => mapping.toProductId),
      );
      const planProductIds = introducedProducts
        .filter(
          (product) =>
            migrationTargets.has(product.id) &&
            isProfessionalPlan(product) &&
            !["disabled", "archived"].includes(product.status),
        )
        .map((product) => product.id);
      if (planProductIds.length === 0) return null;

      const addonProductIds = introducedProducts
        .filter(isPresentableAddon)
        .map((product) => product.id);
      const migrationSourceProductIds = catalog.migrationMappings
        .filter((mapping) => migrationTargets.has(mapping.toProductId))
        .map((mapping) => mapping.fromProductId);

      return professionalCatalogPresentationSchema.parse({
        catalog: publicSnapshot(catalog, [
          ...planProductIds,
          ...addonProductIds,
          ...migrationSourceProductIds,
        ]),
        mode: "draft_preview",
        checkoutEnabled: false,
        planProductIds,
        addonProductIds,
      });
    })
    .find(
      (candidate): candidate is ProfessionalCatalogPresentation =>
        candidate !== null,
    );

  const predecessor = [...candidates]
    .filter(
      ({ version }) =>
        version.marketCode === activeCatalog.marketCode &&
        version.versionNumber < activeCatalog.versionNumber,
    )
    .sort(
      (left, right) => right.version.versionNumber - left.version.versionNumber,
    )[0]?.catalog;

  return preview || activePresentation(activeCatalog, predecessor);
}
