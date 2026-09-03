import React, { useCallback, useEffect, useState } from "react";
import type {
  DigitalAssetStatus,
  DigitalFulfillmentType,
  DigitalMarketPolicy,
} from "@shongre/contracts/digital-products";
import { FileKey2, KeyRound, ShieldAlert, TicketCheck } from "lucide-react";
import { services } from "../../api/client/service-registry";
import type { DigitalAdminOverview } from "../../api/contracts/digital-products.contract";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { Badge, Button, Checkbox, Skeleton } from "../../design-system";
import { FormField, Input } from "../../design-system/primitives/FormField";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import { digitalMessagesFr } from "../../i18n/digital.catalogue.fr";
import { useAuthorization } from "../../security/useAuthorization";

const ASSET_KEYS: Record<
  DigitalAssetStatus,
  | "digital.asset.processing"
  | "digital.asset.ready"
  | "digital.asset.quarantined"
  | "digital.asset.rejected"
  | "digital.asset.unavailable"
> = {
  UPLOAD_PENDING: "digital.asset.processing",
  PROCESSING: "digital.asset.processing",
  SCANNING: "digital.asset.processing",
  READY: "digital.asset.ready",
  QUARANTINED: "digital.asset.quarantined",
  REJECTED: "digital.asset.rejected",
  REMOVED: "digital.asset.unavailable",
  UNAVAILABLE: "digital.asset.unavailable",
};

export const AdminDigitalProductsPage: React.FC = () => {
  const { t } = useTranslation(digitalMessagesFr);
  const { activeMarket } = useMarketLocation();
  const { can } = useAuthorization();
  const canModerate = can("moderation.action");
  const canManagePolicy = can("market.manage");
  usePageMeta({
    title: t("meta.digitalAdmin.title"),
    description: t("meta.digitalAdmin.description"),
    canonicalPath: "/admin/produits-numeriques",
    noIndex: true,
  });
  const [snapshot, setSnapshot] = useState<DigitalAdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [policy, setPolicy] = useState<DigitalMarketPolicy | null>(null);
  const [policyReason, setPolicyReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [nextSnapshot, nextPolicy] = await Promise.all([
        services.digitalProducts.getAdminOverview(activeMarket.code),
        canManagePolicy
          ? services.digitalProducts.getAdminPolicy(activeMarket.code)
          : Promise.resolve(null),
      ]);
      setSnapshot(nextSnapshot);
      setPolicy(nextPolicy);
    } catch {
      setSnapshot(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [activeMarket.code, canManagePolicy]);

  useEffect(() => {
    void load();
  }, [load]);

  const moderate = async (
    assetId: string,
    decision: "APPROVED" | "REJECTED",
  ) => {
    setBusyId(assetId);
    setError(false);
    try {
      await services.digitalProducts.moderateAsset(
        activeMarket.code,
        assetId,
        decision,
      );
      await load();
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  };

  const updateList = (
    key: "allowedCategoryIds" | "allowedMimeTypes" | "allowedFileExtensions",
    value: string,
  ) =>
    setPolicy((current) =>
      current
        ? {
            ...current,
            [key]: value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          }
        : current,
    );

  const toggleFulfillment = (type: DigitalFulfillmentType) =>
    setPolicy((current) => {
      if (!current) return current;
      const allowedFulfillmentTypes = current.allowedFulfillmentTypes.includes(
        type,
      )
        ? current.allowedFulfillmentTypes.filter((item) => item !== type)
        : [...current.allowedFulfillmentTypes, type];
      const allowedFulfillmentCombinations = allowedFulfillmentTypes.map(
        (item) => [item],
      );
      if (
        allowedFulfillmentTypes.includes("ACCESS_LINK") &&
        allowedFulfillmentTypes.includes("ACCESS_CREDENTIALS")
      ) {
        allowedFulfillmentCombinations.push([
          "ACCESS_LINK",
          "ACCESS_CREDENTIALS",
        ]);
      }
      return {
        ...current,
        allowedFulfillmentTypes,
        allowedFulfillmentCombinations,
      };
    });

  const savePolicyDraft = async () => {
    if (!policy || policyReason.trim().length < 10) return;
    setBusyId("policy-draft");
    setError(false);
    try {
      setPolicy(
        await services.digitalProducts.createAdminPolicyDraft(
          activeMarket.code,
          policy,
          policyReason.trim(),
        ),
      );
      setPolicyReason("");
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  };

  const activatePolicy = async () => {
    if (
      !policy?.id ||
      policy.status !== "DRAFT" ||
      policyReason.trim().length < 10
    )
      return;
    setBusyId("policy-activate");
    setError(false);
    try {
      setPolicy(
        await services.digitalProducts.activateAdminPolicy(
          activeMarket.code,
          policy.id,
          policyReason.trim(),
        ),
      );
      setPolicyReason("");
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border-base bg-bg-surface p-5 shadow-xs">
        <div className="flex items-center gap-2 text-primary">
          <FileKey2 className="h-icon-md w-icon-md" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-wider">
            {activeMarket.code}
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-text-main">
          {t("digital.admin.title")}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-text-secondary">
          {t("digital.admin.description")}
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-danger-border bg-danger-surface p-4"
        >
          <p className="text-sm font-bold text-danger">
            {t("digital.common.error")}
          </p>
          <Button
            className="mt-3"
            variant="secondary"
            onClick={() => void load()}
          >
            {t("digital.common.retry")}
          </Button>
        </div>
      ) : null}

      {loading ? <Skeleton className="h-72 rounded-2xl" /> : null}

      {!loading && snapshot ? (
        <>
          <section
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            aria-label={t("digital.admin.description")}
          >
            {[
              [t("digital.admin.assets"), snapshot.assets.length, FileKey2],
              [
                t("digital.admin.inventory"),
                snapshot.inventory.reduce(
                  (sum, item) => sum + item.availableCount,
                  0,
                ),
                KeyRound,
              ],
              [
                t("digital.admin.entitlements"),
                snapshot.entitlements.length,
                TicketCheck,
              ],
              [
                t("digital.admin.reports"),
                snapshot.openReportCount,
                ShieldAlert,
              ],
            ].map(([label, value, Icon]) => {
              const MetricIcon = Icon as typeof FileKey2;
              return (
                <div
                  key={String(label)}
                  className="rounded-2xl border border-border-base bg-bg-surface p-4 shadow-xs"
                >
                  <MetricIcon
                    className="h-icon-md w-icon-md text-primary"
                    aria-hidden="true"
                  />
                  <div className="mt-3 text-2xl font-bold text-text-main">
                    {String(value)}
                  </div>
                  <div className="text-xs font-bold text-text-secondary">
                    {String(label)}
                  </div>
                </div>
              );
            })}
          </section>

          <section
            className="rounded-2xl border border-border-base bg-bg-surface p-5 shadow-xs"
            aria-labelledby="digital-assets-title"
          >
            <h2
              id="digital-assets-title"
              className="text-lg font-bold text-text-main"
            >
              {t("digital.admin.assets")}
            </h2>
            <div className="mt-4 space-y-3">
              {snapshot.assets.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  {t("digital.common.empty")}
                </p>
              ) : (
                snapshot.assets.map((asset) => (
                  <article
                    key={asset.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-base p-4"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-text-main">
                        {asset.safeFileName}
                      </div>
                      <div className="mt-1 text-xs text-text-secondary">
                        {asset.contentType} · {asset.sizeBytes} o · v
                        {asset.version}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          asset.status === "READY"
                            ? "success"
                            : asset.status === "QUARANTINED"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {t(ASSET_KEYS[asset.status])}
                      </Badge>
                      {canModerate &&
                      (asset.status === "QUARANTINED" ||
                        asset.status === "PROCESSING") ? (
                        <>
                          <Button
                            variant="secondary"
                            disabled={busyId === asset.id}
                            onClick={() => void moderate(asset.id, "APPROVED")}
                          >
                            {t("digital.admin.approve")}
                          </Button>
                          <Button
                            variant="danger"
                            disabled={busyId === asset.id}
                            onClick={() => void moderate(asset.id, "REJECTED")}
                          >
                            {t("digital.admin.reject")}
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          {canManagePolicy && policy ? (
            <section
              className="rounded-2xl border border-border-base bg-bg-surface p-5 shadow-xs"
              aria-labelledby="digital-policy-title"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2
                    id="digital-policy-title"
                    className="text-lg font-bold text-text-main"
                  >
                    {t("digital.admin.policy")}
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    {t("digital.admin.policyDescription")}
                  </p>
                </div>
                <Badge
                  variant={
                    policy.status === "ACTIVE"
                      ? "success"
                      : policy.status === "DRAFT"
                        ? "warning"
                        : "neutral"
                  }
                >
                  v{policy.version} · {policy.status}
                </Badge>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <FormField label={t("digital.admin.categories")}>
                  <Input
                    value={policy.allowedCategoryIds.join(", ")}
                    onChange={(event) =>
                      updateList("allowedCategoryIds", event.target.value)
                    }
                  />
                </FormField>
                <FormField label={t("digital.admin.domains")}>
                  <Input
                    value={policy.externalLinks.acceptedDomains.join(", ")}
                    onChange={(event) =>
                      setPolicy({
                        ...policy,
                        externalLinks: {
                          ...policy.externalLinks,
                          acceptedDomains: event.target.value
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        },
                      })
                    }
                  />
                </FormField>
                <FormField label={t("digital.admin.mimeTypes")}>
                  <Input
                    value={policy.allowedMimeTypes.join(", ")}
                    onChange={(event) =>
                      updateList("allowedMimeTypes", event.target.value)
                    }
                  />
                </FormField>
                <FormField label={t("digital.admin.extensions")}>
                  <Input
                    value={policy.allowedFileExtensions.join(", ")}
                    onChange={(event) =>
                      updateList("allowedFileExtensions", event.target.value)
                    }
                  />
                </FormField>
                <FormField label={t("digital.admin.accessClasses")}>
                  <Input
                    value={policy.credentialInventory.allowedClasses.join(", ")}
                    onChange={(event) =>
                      setPolicy({
                        ...policy,
                        credentialInventory: {
                          ...policy.credentialInventory,
                          allowedClasses: event.target.value
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        },
                      })
                    }
                  />
                </FormField>
                <FormField label={t("digital.admin.prohibitedClasses")}>
                  <Input
                    value={policy.credentialInventory.prohibitedClasses.join(
                      ", ",
                    )}
                    onChange={(event) =>
                      setPolicy({
                        ...policy,
                        credentialInventory: {
                          ...policy.credentialInventory,
                          prohibitedClasses: event.target.value
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        },
                      })
                    }
                  />
                </FormField>
                {(
                  [
                    ["taxPolicyVersion", "digital.admin.taxEvidence"],
                    ["refundPolicyVersion", "digital.admin.refundEvidence"],
                    [
                      "withdrawalPresentationVersion",
                      "digital.admin.withdrawalEvidence",
                    ],
                    [
                      "paymentProviderConfigurationId",
                      "digital.admin.paymentEvidence",
                    ],
                    ["legalApprovalId", "digital.admin.legalEvidence"],
                  ] as const
                ).map(([key, label]) => (
                  <FormField key={key} label={t(label)}>
                    <Input
                      value={policy[key] ?? ""}
                      onChange={(event) =>
                        setPolicy({
                          ...policy,
                          [key]: event.target.value.trim() || null,
                        })
                      }
                    />
                  </FormField>
                ))}
              </div>

              <fieldset className="mt-5">
                <legend className="text-sm font-bold text-text-main">
                  {t("digital.admin.fulfillmentTypes")}
                </legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      "FILE_DOWNLOAD",
                      "ACCESS_LINK",
                      "ACCESS_CREDENTIALS",
                      "SELLER_PROVISIONED",
                    ] as const
                  ).map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-3 rounded-xl border border-border-base p-3 text-sm font-semibold text-text-main"
                    >
                      <Checkbox
                        checked={policy.allowedFulfillmentTypes.includes(type)}
                        onChange={() => toggleFulfillment(type)}
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="mt-5">
                <legend className="text-sm font-bold text-text-main">
                  {t("digital.admin.capabilities")}
                </legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(
                    Object.keys(policy.capabilities) as Array<
                      keyof DigitalMarketPolicy["capabilities"]
                    >
                  ).map((capability) => (
                    <label
                      key={capability}
                      className="flex items-center gap-3 rounded-xl border border-border-base p-3 text-sm font-semibold text-text-main"
                    >
                      <Checkbox
                        checked={policy.capabilities[capability]}
                        onChange={() =>
                          setPolicy({
                            ...policy,
                            capabilities: {
                              ...policy.capabilities,
                              [capability]: !policy.capabilities[capability],
                            },
                          })
                        }
                      />
                      {capability}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-end">
                <div className="flex-1">
                  <FormField label={t("digital.admin.changeReason")} required>
                    <Input
                      value={policyReason}
                      onChange={(event) => setPolicyReason(event.target.value)}
                    />
                  </FormField>
                </div>
                <Button
                  variant="secondary"
                  disabled={policyReason.trim().length < 10 || busyId !== null}
                  isLoading={busyId === "policy-draft"}
                  onClick={() => void savePolicyDraft()}
                >
                  {t("digital.admin.createDraft")}
                </Button>
                <Button
                  disabled={
                    policy.status !== "DRAFT" ||
                    !policy.id ||
                    policyReason.trim().length < 10 ||
                    busyId !== null
                  }
                  isLoading={busyId === "policy-activate"}
                  onClick={() => void activatePolicy()}
                >
                  {t("digital.admin.activate")}
                </Button>
              </div>
              <p className="mt-3 text-xs text-text-secondary">
                {t("digital.admin.failClosed")}
              </p>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
};
