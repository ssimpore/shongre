import React, { useState } from "react";
import { Select } from "../../design-system";
import type { MonetizationProduct } from "@shongre/contracts/monetization";
import {
  hasCommercialEntitlementValue,
  isCommercialEntitlementOperational,
  MONETIZATION_ADMIN_CONSTRAINTS,
} from "@shongre/contracts/monetization";
import { Button } from "../../design-system/primitives/Button";
import {
  FormField,
  Input,
  Textarea,
} from "../../design-system/primitives/FormField";
import { Modal } from "../../design-system/primitives/Modal";
import { useRegionalFormatters } from "../../hooks/useRegionalFormatters";
import { useTranslation } from "../../i18n/I18nProvider";

type AdminPlanDraftModalProps = {
  product: MonetizationProduct;
  targetVersion: number;
  saving: boolean;
  onClose: () => void;
  onCreate: (input: {
    product: MonetizationProduct;
    reason: string;
    effectiveFrom?: string;
  }) => Promise<void>;
};

const csv = (values: string[]) => values.join(", ");
const parseCsv = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
const localDateTime = (value?: string) => value?.slice(0, 16) || "";
const optionalIso = (value: string) =>
  value ? new Date(value).toISOString() : undefined;
export function AdminPlanDraftModal({
  product,
  targetVersion,
  saving,
  onClose,
  onCreate,
}: AdminPlanDraftModalProps) {
  const { t } = useTranslation();
  const { formatMoneyMinor } = useRegionalFormatters();
  const [draft, setDraft] = useState<MonetizationProduct>(() =>
    structuredClone(product),
  );
  const [reason, setReason] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");

  const updatePrice = (
    priceId: string,
    update: (
      price: MonetizationProduct["prices"][number],
    ) => MonetizationProduct["prices"][number],
  ) => {
    setDraft((current) => ({
      ...current,
      prices: current.prices.map((price) =>
        price.id === priceId ? update(price) : price,
      ),
    }));
  };

  const updateEntitlement = (
    key: string,
    update: (
      entitlement: MonetizationProduct["entitlements"][number],
    ) => MonetizationProduct["entitlements"][number],
  ) => {
    setDraft((current) => ({
      ...current,
      entitlements: current.entitlements.map((entitlement) =>
        entitlement.key === key ? update(entitlement) : entitlement,
      ),
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      reason.trim().length <
      MONETIZATION_ADMIN_CONSTRAINTS.changeReason.minLength
    )
      return;
    await onCreate({
      product: draft,
      reason: reason.trim(),
      effectiveFrom: optionalIso(effectiveFrom),
    });
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("admin.adminPlanDraftModal.configurerLOffreDansUnBrouillon")}
      description={t("admin.adminPlanDraftModal.prixQuotasFonctionnalitesEtEssaiSontVersionnesEnsembleLaVersion")}
      maxWidth="xl"
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="rounded-control border border-border-base bg-bg-subtle p-3 text-xs">
          <strong>{product.name}</strong> · version cible v{targetVersion}
        </div>

        <section
          className="rounded-card border border-primary-border bg-primary-light p-4"
          aria-labelledby="plan-preview-heading"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-micro font-black uppercase tracking-wide text-primary">
                {t("admin.adminPlanDraftModal.apercuAvantPublication")}
              </div>
              <h3
                id="plan-preview-heading"
                className="mt-1 text-base font-black"
              >
                {draft.name}
              </h3>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-text-secondary">
                {draft.description}
              </p>
            </div>
            <div className="shrink-0 text-right">
              {draft.prices.map((price) => (
                <div
                  key={price.id}
                  className="text-xs font-black text-text-main"
                >
                  {formatMoneyMinor(
                    price.amount.amountMinor,
                    price.amount.currency,
                  )}
                  {price.billingPeriod === "month"
                    ? " / mois"
                    : price.billingPeriod === "year"
                      ? " / an"
                      : ""}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {draft.entitlements
              .filter(
                (entitlement) =>
                  isCommercialEntitlementOperational(entitlement) &&
                  hasCommercialEntitlementValue(entitlement.value),
              )
              .slice(0, 8)
              .map((entitlement) => (
                <span
                  key={entitlement.key}
                  className="rounded-pill border border-primary-border bg-bg-surface px-2 py-1 text-micro font-bold text-text-secondary"
                >
                  {entitlement.label}
                  {entitlement.availability === "beta" ? " · Bêta" : ""}
                </span>
              ))}
          </div>
          {draft.entitlements.some(
            (entitlement) =>
              !isCommercialEntitlementOperational(entitlement) &&
              hasCommercialEntitlementValue(entitlement.value),
          ) ? (
            <p className="mt-3 text-xs font-bold text-warning">
              {t("admin.adminPlanDraftModal.lesFonctionnalitesIncompletesOuEnMaintenanceSontExcluesDeCet")}
            </p>
          ) : null}
        </section>

        <section className="space-y-3" aria-labelledby="plan-identity-heading">
          <h3 id="plan-identity-heading" className="text-sm font-black">
            {t("admin.adminPlanDraftModal.presentationEtDisponibilite")}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Nom public" required>
              <Input
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </FormField>
            <FormField label={t("search.searchPage.etat")}>
              <Select
                className="w-full"
                labelledByAncestor
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value as MonetizationProduct["status"],
                  }))
                }
              >
                <option value="active">{t("admin.adminPlanDraftModal.actifApresPublication")}</option>
                <option value="disabled">{t("admin.providerCatalogTable.desactive")}</option>
                <option value="archived">{t("admin.adminMarketsPage.archive")}</option>
              </Select>
            </FormField>
          </div>
          <FormField label="Description publique" required>
            <Textarea
              rows={3}
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Ordre d’affichage">
              <Input
                type="number"
                min={MONETIZATION_ADMIN_CONSTRAINTS.nonNegativeInteger.min}
                step={MONETIZATION_ADMIN_CONSTRAINTS.nonNegativeInteger.step}
                value={draft.commercialProfile.displayOrder}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    commercialProfile: {
                      ...current.commercialProfile,
                      displayOrder: Math.max(
                        MONETIZATION_ADMIN_CONSTRAINTS.nonNegativeInteger.min,
                        Number(event.target.value),
                      ),
                    },
                  }))
                }
              />
            </FormField>
            <FormField
              label="Pays disponibles"
              hint="Codes séparés par des virgules."
            >
              <Input
                value={csv(draft.commercialProfile.countryAvailability)}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    commercialProfile: {
                      ...current.commercialProfile,
                      countryAvailability: parseCsv(
                        event.target.value.toUpperCase(),
                      ) as MonetizationProduct["commercialProfile"]["countryAvailability"],
                    },
                  }))
                }
              />
            </FormField>
            <label className="flex min-h-control-touch items-center gap-2 rounded-control border border-border-base px-3 text-xs font-bold">
              <input
                type="checkbox"
                checked={draft.recommended}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    recommended: event.target.checked,
                  }))
                }
              />
              {t("admin.adminPlanDraftModal.offreRecommandee")}
            </label>
          </div>
          <FormField
            label={t("admin.adminPlanDraftModal.categoriesCiblees")}
            hint="Identifiants séparés par des virgules. Les règles serveur restent autoritaires."
          >
            <Input
              value={csv(draft.commercialProfile.targetCategoryIds)}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  commercialProfile: {
                    ...current.commercialProfile,
                    targetCategoryIds: parseCsv(event.target.value),
                  },
                }))
              }
            />
          </FormField>
        </section>

        <section className="space-y-3" aria-labelledby="plan-prices-heading">
          <h3 id="plan-prices-heading" className="text-sm font-black">
            Prix
          </h3>
          <div className="space-y-3">
            {draft.prices.map((price) => (
              <div
                key={price.id}
                className="grid gap-3 rounded-control border border-border-base p-3 sm:grid-cols-2 lg:grid-cols-4"
              >
                <FormField label={`Montant ${price.billingPeriod} (centimes)`}>
                  <Input
                    type="number"
                    min={MONETIZATION_ADMIN_CONSTRAINTS.moneyMinor.min}
                    step={MONETIZATION_ADMIN_CONSTRAINTS.moneyMinor.step}
                    value={price.amount.amountMinor}
                    onChange={(event) =>
                      updatePrice(price.id, (current) => ({
                        ...current,
                        amount: {
                          ...current.amount,
                          amountMinor: Math.max(
                            MONETIZATION_ADMIN_CONSTRAINTS.moneyMinor.min,
                            Number(event.target.value),
                          ),
                        },
                      }))
                    }
                  />
                </FormField>
                <FormField label={t("admin.adminPlanDraftModal.tvaPointsDeBase")}>
                  <Input
                    type="number"
                    min={MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.min}
                    max={MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.max}
                    step={MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.step}
                    value={price.taxRateBps}
                    onChange={(event) =>
                      updatePrice(price.id, (current) => ({
                        ...current,
                        taxRateBps: Math.min(
                          MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.max,
                          Math.max(
                            MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.min,
                            Number(event.target.value),
                          ),
                        ),
                      }))
                    }
                  />
                </FormField>
                <FormField label={t("admin.adminPlanDraftModal.debutDuPrix")}>
                  <Input
                    type="datetime-local"
                    value={localDateTime(price.effectiveFrom)}
                    onChange={(event) =>
                      updatePrice(price.id, (current) => ({
                        ...current,
                        effectiveFrom: optionalIso(event.target.value),
                      }))
                    }
                  />
                </FormField>
                <FormField label={t("admin.adminPlanDraftModal.finDuPrix")}>
                  <Input
                    type="datetime-local"
                    value={localDateTime(price.effectiveUntil)}
                    onChange={(event) =>
                      updatePrice(price.id, (current) => ({
                        ...current,
                        effectiveUntil: optionalIso(event.target.value),
                      }))
                    }
                  />
                </FormField>
                <label className="flex items-center gap-2 text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={price.priceIncludesTax}
                    onChange={(event) =>
                      updatePrice(price.id, (current) => ({
                        ...current,
                        priceIncludesTax: event.target.checked,
                      }))
                    }
                  />
                  Prix TTC
                </label>
              </div>
            ))}
          </div>
        </section>

        <section
          className="space-y-3"
          aria-labelledby="plan-entitlements-heading"
        >
          <div>
            <h3 id="plan-entitlements-heading" className="text-sm font-black">
              {t("admin.adminPlanDraftModal.quotasEtFonctionnalites")}
            </h3>
            <p className="mt-1 text-micro text-text-muted">
              {t("admin.adminPlanDraftModal.cesValeursAlimententLaComparaisonLUsageEtLesControles")}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {draft.entitlements.map((entitlement) => (
              <div
                key={entitlement.key}
                className="rounded-control border border-border-base p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-micro font-bold text-text-muted">
                    {entitlement.key}
                  </div>
                  <span
                    className={`rounded-pill px-2 py-0.5 text-micro font-bold ${
                      entitlement.implementationStatus === "ready"
                        ? "bg-success-surface text-success"
                        : "bg-warning-surface text-warning"
                    }`}
                  >
                    {entitlement.implementationStatus === "ready"
                      ? "Implémenté"
                      : entitlement.implementationStatus ===
                          "external_dependency"
                        ? "Dépendance externe"
                        : "Incomplet"}
                  </span>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <FormField label={t("admin.adminPlanDraftModal.disponibilite")}>
                    <Select
                      className="w-full"
                      labelledByAncestor
                      value={entitlement.availability}
                      disabled={entitlement.implementationStatus !== "ready"}
                      onChange={(event) =>
                        updateEntitlement(entitlement.key, (current) => ({
                          ...current,
                          availability: event.target
                            .value as MonetizationProduct["entitlements"][number]["availability"],
                        }))
                      }
                    >
                      <option value="enabled">{t("admin.adminPlanDraftModal.active")}</option>
                      <option value="beta">{t("admin.adminPlanDraftModal.beta")}</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="disabled">{t("admin.providerCatalogTable.desactive")}</option>
                    </Select>
                  </FormField>
                  <FormField label="Type">
                    <Select
                      className="w-full"
                      labelledByAncestor
                      value={entitlement.featureType}
                      onChange={(event) =>
                        updateEntitlement(entitlement.key, (current) => ({
                          ...current,
                          featureType: event.target
                            .value as MonetizationProduct["entitlements"][number]["featureType"],
                        }))
                      }
                    >
                      <option value="boolean">{t("admin.adminPlanDraftModal.booleen")}</option>
                      <option value="integer_quota">Quota entier</option>
                      <option value="additive_quota">Quota additionnel</option>
                      <option value="level">Niveau</option>
                      <option value="monetary_credit">{t("admin.adminPlanDraftModal.credit")}</option>
                      <option value="scoped_permission">
                        {t("admin.adminPlanDraftModal.permissionCiblee")}
                      </option>
                    </Select>
                  </FormField>
                </div>
                <FormField label={entitlement.label} className="mt-2">
                  {typeof entitlement.value === "boolean" ? (
                    <Select
                      className="w-full"
                      labelledByAncestor
                      value={entitlement.value ? "true" : "false"}
                      onChange={(event) =>
                        updateEntitlement(entitlement.key, (current) => ({
                          ...current,
                          value: event.target.value === "true",
                        }))
                      }
                    >
                      <option value="true">Inclus</option>
                      <option value="false">Non inclus</option>
                    </Select>
                  ) : (
                    <Input
                      type={
                        typeof entitlement.value === "number"
                          ? "number"
                          : "text"
                      }
                      min={
                        typeof entitlement.value === "number" ? 0 : undefined
                      }
                      value={
                        Array.isArray(entitlement.value)
                          ? csv(entitlement.value)
                          : entitlement.value
                      }
                      onChange={(event) =>
                        updateEntitlement(entitlement.key, (current) => ({
                          ...current,
                          value: Array.isArray(current.value)
                            ? parseCsv(event.target.value)
                            : typeof current.value === "number"
                              ? Math.max(
                                  MONETIZATION_ADMIN_CONSTRAINTS
                                    .nonNegativeInteger.min,
                                  Number(event.target.value),
                                )
                              : event.target.value,
                        }))
                      }
                    />
                  )}
                </FormField>
                <FormField label="Description interne" className="mt-2">
                  <Textarea
                    rows={2}
                    value={entitlement.description}
                    onChange={(event) =>
                      updateEntitlement(entitlement.key, (current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </FormField>
                <FormField
                  label={t("admin.adminPlanDraftModal.dependances")}
                  hint="Codes séparés par des virgules."
                  className="mt-2"
                >
                  <Input
                    value={csv(entitlement.dependencies)}
                    onChange={(event) =>
                      updateEntitlement(entitlement.key, (current) => ({
                        ...current,
                        dependencies: parseCsv(event.target.value),
                      }))
                    }
                  />
                </FormField>
                <p className="mt-2 text-micro leading-relaxed text-text-muted">
                  {entitlement.adminHelpText}
                </p>
              </div>
            ))}
          </div>
        </section>

        {draft.kind === "subscription" ? (
          <section className="space-y-3" aria-labelledby="plan-trial-heading">
            <h3 id="plan-trial-heading" className="text-sm font-black">
              {t("admin.adminPlanDraftModal.essaiEtTransitions")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex min-h-control-touch items-center gap-2 rounded-control border border-border-base px-3 text-xs font-bold">
                <input
                  type="checkbox"
                  checked={draft.commercialProfile.trialPolicy.enabled}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      commercialProfile: {
                        ...current.commercialProfile,
                        trialPolicy: {
                          ...current.commercialProfile.trialPolicy,
                          enabled: event.target.checked,
                          durationDays: event.target.checked
                            ? current.commercialProfile.trialPolicy
                                .durationDays ||
                              MONETIZATION_ADMIN_CONSTRAINTS.trialDurationDays
                                .default
                            : undefined,
                        },
                      },
                    }))
                  }
                />
                {t("admin.adminPlanDraftModal.essaiActive")}
              </label>
              <FormField label={t("admin.adminPlanDraftModal.dureeJours")}>
                <Input
                  type="number"
                  min={MONETIZATION_ADMIN_CONSTRAINTS.trialDurationDays.min}
                  step={MONETIZATION_ADMIN_CONSTRAINTS.trialDurationDays.step}
                  disabled={!draft.commercialProfile.trialPolicy.enabled}
                  value={draft.commercialProfile.trialPolicy.durationDays || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      commercialProfile: {
                        ...current.commercialProfile,
                        trialPolicy: {
                          ...current.commercialProfile.trialPolicy,
                          durationDays: Math.max(
                            MONETIZATION_ADMIN_CONSTRAINTS.trialDurationDays
                              .min,
                            Number(event.target.value),
                          ),
                        },
                      },
                    }))
                  }
                />
              </FormField>
              <label className="flex min-h-control-touch items-center gap-2 rounded-control border border-border-base px-3 text-xs font-bold">
                <input
                  type="checkbox"
                  checked={
                    draft.commercialProfile.trialPolicy.requiresPaymentMethod
                  }
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      commercialProfile: {
                        ...current.commercialProfile,
                        trialPolicy: {
                          ...current.commercialProfile.trialPolicy,
                          requiresPaymentMethod: event.target.checked,
                        },
                      },
                    }))
                  }
                />
                {t("admin.adminPlanDraftModal.moyenDePaiementRequis")}
              </label>
              <label className="flex min-h-control-touch items-center gap-2 rounded-control border border-border-base px-3 text-xs font-bold">
                <input
                  type="checkbox"
                  checked={draft.commercialProfile.trialPolicy.autoConverts}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      commercialProfile: {
                        ...current.commercialProfile,
                        trialPolicy: {
                          ...current.commercialProfile.trialPolicy,
                          autoConverts: event.target.checked,
                        },
                      },
                    }))
                  }
                />
                Conversion automatique
              </label>
              <label className="flex min-h-control-touch items-center gap-2 rounded-control border border-border-base px-3 text-xs font-bold">
                <input
                  type="checkbox"
                  checked={
                    draft.commercialProfile.trialPolicy.firstTimeCustomersOnly
                  }
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      commercialProfile: {
                        ...current.commercialProfile,
                        trialPolicy: {
                          ...current.commercialProfile.trialPolicy,
                          firstTimeCustomersOnly: event.target.checked,
                        },
                      },
                    }))
                  }
                />
                Nouveaux clients uniquement
              </label>
              <FormField label={t("admin.adminPlanDraftModal.marchesEligibles")}>
                <Input
                  value={csv(
                    draft.commercialProfile.trialPolicy.eligibleMarketCodes,
                  )}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      commercialProfile: {
                        ...current.commercialProfile,
                        trialPolicy: {
                          ...current.commercialProfile.trialPolicy,
                          eligibleMarketCodes: parseCsv(
                            event.target.value.toUpperCase(),
                          ) as MonetizationProduct["commercialProfile"]["trialPolicy"]["eligibleMarketCodes"],
                        },
                      },
                    }))
                  }
                />
              </FormField>
              <FormField label={t("admin.adminPlanDraftModal.audiencesEligibles")}>
                <Input
                  value={csv(
                    draft.commercialProfile.trialPolicy.eligibleAudiences,
                  )}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      commercialProfile: {
                        ...current.commercialProfile,
                        trialPolicy: {
                          ...current.commercialProfile.trialPolicy,
                          eligibleAudiences: parseCsv(
                            event.target.value.toLowerCase(),
                          ) as MonetizationProduct["commercialProfile"]["trialPolicy"]["eligibleAudiences"],
                        },
                      },
                    }))
                  }
                />
              </FormField>
              <FormField label={t("admin.adminPlanDraftModal.debutDeCampagneDEssai")}>
                <Input
                  type="datetime-local"
                  value={localDateTime(
                    draft.commercialProfile.trialPolicy.campaignStartsAt,
                  )}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      commercialProfile: {
                        ...current.commercialProfile,
                        trialPolicy: {
                          ...current.commercialProfile.trialPolicy,
                          campaignStartsAt: optionalIso(event.target.value),
                        },
                      },
                    }))
                  }
                />
              </FormField>
              <FormField label={t("admin.adminPlanDraftModal.finDeCampagneDEssai")}>
                <Input
                  type="datetime-local"
                  value={localDateTime(
                    draft.commercialProfile.trialPolicy.campaignEndsAt,
                  )}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      commercialProfile: {
                        ...current.commercialProfile,
                        trialPolicy: {
                          ...current.commercialProfile.trialPolicy,
                          campaignEndsAt: optionalIso(event.target.value),
                        },
                      },
                    }))
                  }
                />
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label={t("admin.adminPlanDraftModal.monteesAutorisees")}
                hint="Identifiants séparés par des virgules."
              >
                <Input
                  value={csv(draft.commercialProfile.upgradeProductIds)}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      commercialProfile: {
                        ...current.commercialProfile,
                        upgradeProductIds: parseCsv(event.target.value),
                      },
                    }))
                  }
                />
              </FormField>
              <FormField
                label={t("admin.adminPlanDraftModal.baissesAutorisees")}
                hint="Identifiants séparés par des virgules."
              >
                <Input
                  value={csv(draft.commercialProfile.downgradeProductIds)}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      commercialProfile: {
                        ...current.commercialProfile,
                        downgradeProductIds: parseCsv(event.target.value),
                      },
                    }))
                  }
                />
              </FormField>
            </div>
          </section>
        ) : null}

        <section className="space-y-3 border-t border-border-subtle pt-4">
          <FormField
            label={t("admin.adminMonetizationPage.motifDuChangement")}
            required
            hint="Visible dans l’audit et par l’approbateur."
          >
            <Textarea
              rows={3}
              minLength={MONETIZATION_ADMIN_CONSTRAINTS.changeReason.minLength}
              maxLength={MONETIZATION_ADMIN_CONSTRAINTS.changeReason.maxLength}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </FormField>
          <FormField
            label={t("admin.adminPlanDraftModal.activationPlanifiee")}
            hint="Laissez vide pour une activation à la publication."
          >
            <Input
              type="datetime-local"
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
            />
          </FormField>
        </section>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={
              saving ||
              reason.trim().length <
                MONETIZATION_ADMIN_CONSTRAINTS.changeReason.minLength
            }
          >
            {saving ? "Création…" : "Créer le brouillon"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
