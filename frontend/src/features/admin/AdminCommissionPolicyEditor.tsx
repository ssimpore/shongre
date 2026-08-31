import React, { useMemo, useState } from "react";
import { Select } from "../../design-system";
import type {
  CommercialConfigurationVersion,
  CommissionEffect,
  CommissionModel,
  CommissionPolicy,
  CommissionScope,
  MonetizationCatalog,
} from "@shongre/contracts/monetization";
import { MONETIZATION_ADMIN_CONSTRAINTS } from "@shongre/contracts/monetization";
import { services } from "../../api";
import { Button } from "../../design-system/primitives/Button";
import {
  FormField,
  Input,
  Textarea,
} from "../../design-system/primitives/FormField";
import { Modal } from "../../design-system/primitives/Modal";
import { marketService } from "../../domains/market/market.service";
import { useTranslation } from "../../i18n/I18nProvider";

const EMPTY_SCOPE: CommissionScope = {
  countryCodes: [],
  marketCodes: [],
  currencies: [],
  verticalIds: [],
  categoryIds: [],
  subcategoryIds: [],
  transactionTypes: [],
  sellerTypes: [],
  sellerSegments: [],
  planIds: [],
  organizationIds: [],
  accountIds: [],
  campaignIds: [],
  paymentMethods: [],
};

type ScopeLevel =
  | "global"
  | "countryCodes"
  | "verticalIds"
  | "categoryIds"
  | "subcategoryIds"
  | "transactionTypes"
  | "sellerTypes"
  | "planIds"
  | "organizationIds"
  | "accountIds"
  | "campaignIds";
type ScopeKey = Exclude<ScopeLevel, "global">;
type EditableModelType = CommissionModel["type"];
type AdjustmentType = Extract<
  CommissionEffect,
  { kind: "adjustment" }
>["adjustment"]["type"];

function initialScope(policy?: CommissionPolicy | null): {
  level: ScopeLevel;
  values: string;
} {
  if (!policy)
    return {
      level: "countryCodes",
      values: marketService.getDefaultMarket().countryCode,
    };
  const scope = policy.rules[0]?.scope;
  const ordered: ScopeKey[] = [
    "accountIds",
    "organizationIds",
    "campaignIds",
    "planIds",
    "subcategoryIds",
    "categoryIds",
    "verticalIds",
    "transactionTypes",
    "sellerTypes",
    "countryCodes",
  ];
  const level = ordered.find((key) => (scope?.[key]?.length || 0) > 0);
  return level
    ? { level, values: scope?.[level].join(", ") || "" }
    : { level: "global", values: "" };
}

function modelDefaults(policy?: CommissionPolicy | null): {
  type: EditableModelType;
  rateBps: number;
  fixedMinor: number;
  minimumMinor: string;
  maximumMinor: string;
  thresholdMinor: number;
  thresholdApplies: "at_or_above" | "above" | "below";
  tierMode: "progressive" | "cliff";
  tierBasis: "transaction_amount" | "historical_volume";
  volumePeriod: "month" | "quarter" | "year" | "lifetime";
  tiers: string;
} {
  const effect = policy?.rules[0]?.effect;
  if (!effect || effect.kind !== "commission") {
    return {
      type: "percentage" as const,
      rateBps: 500,
      fixedMinor: 0,
      minimumMinor: "",
      maximumMinor: "",
      thresholdMinor: 0,
      thresholdApplies: "at_or_above",
      tierMode: "progressive",
      tierBasis: "transaction_amount",
      volumePeriod: "month",
      tiers: "0-*:500:0",
    };
  }
  const model = effect.model;
  return {
    type: model.type,
    rateBps: "rateBps" in model ? model.rateBps : 0,
    fixedMinor: "fixedMinor" in model ? model.fixedMinor : 0,
    minimumMinor:
      model.minimumMinor === undefined ? "" : String(model.minimumMinor),
    maximumMinor:
      model.maximumMinor === undefined ? "" : String(model.maximumMinor),
    thresholdMinor: model.type === "threshold" ? model.thresholdMinor : 0,
    thresholdApplies:
      model.type === "threshold" ? model.appliesWhen : "at_or_above",
    tierMode: model.type === "tiered" ? model.tierMode : "progressive",
    tierBasis: model.type === "tiered" ? model.basis : "transaction_amount",
    volumePeriod:
      model.type === "tiered" && model.volumePeriod
        ? model.volumePeriod
        : "month",
    tiers:
      model.type === "tiered"
        ? model.tiers
            .map(
              (tier) =>
                `${tier.fromMinor}-${tier.toMinor ?? "*"}:${tier.rateBps}:${tier.fixedMinor}`,
            )
            .join("\n")
        : "0-*:500:0",
  };
}

function parseTiers(value: string) {
  return value
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [range, rate, fixed = "0"] = line.split(":");
      const [from, to] = (range || "").split("-");
      const fromMinor = Number(from);
      const rateBps = Number(rate);
      const fixedMinor = Number(fixed);
      const toMinor = to === "*" || to === "" ? undefined : Number(to);
      if (
        !Number.isInteger(fromMinor) ||
        !Number.isInteger(rateBps) ||
        !Number.isInteger(fixedMinor) ||
        (toMinor !== undefined && !Number.isInteger(toMinor))
      ) {
        throw new Error(
          "Paliers invalides. Format attendu : début-fin:tauxBps:fixeMinor.",
        );
      }
      return { fromMinor, toMinor, rateBps, fixedMinor };
    });
}

interface AdminCommissionPolicyEditorProps {
  catalog: MonetizationCatalog;
  template?: CommissionPolicy | null;
  onClose(): void;
  onCreated(version: CommercialConfigurationVersion): void;
}

export function AdminCommissionPolicyEditor({
  catalog,
  template,
  onClose,
  onCreated,
}: AdminCommissionPolicyEditorProps) {
  const { t } = useTranslation();
  const seedScope = useMemo(() => initialScope(template), [template]);
  const seedModel = useMemo(() => modelDefaults(template), [template]);
  const templateEffect = template?.rules[0]?.effect;
  const [form, setForm] = useState({
    name: template
      ? `${template.name} — copie`
      : "Nouvelle politique de commission",
    code: template ? `${template.code}.copy` : "commission.custom",
    description:
      template?.description || "Politique administrée et versionnée.",
    scopeLevel: seedScope.level,
    scopeValues: seedScope.values,
    policyType: template?.policyType || ("base" as "base" | "adjustment"),
    modelType: seedModel.type,
    rateBps: seedModel.rateBps,
    fixedMinor: seedModel.fixedMinor,
    minimumMinor: seedModel.minimumMinor,
    maximumMinor: seedModel.maximumMinor,
    thresholdMinor: seedModel.thresholdMinor,
    thresholdApplies: seedModel.thresholdApplies,
    tierMode: seedModel.tierMode,
    tierBasis: seedModel.tierBasis,
    volumePeriod: seedModel.volumePeriod,
    tiers: seedModel.tiers,
    adjustmentType:
      templateEffect?.kind === "adjustment"
        ? templateEffect.adjustment.type
        : ("percentage_discount" as AdjustmentType),
    stackingPolicy:
      templateEffect?.kind === "adjustment"
        ? templateEffect.stackingPolicy
        : ("exclusive" as "exclusive" | "best_price" | "stackable"),
    promotionId:
      templateEffect?.kind === "adjustment"
        ? templateEffect.promotionId || ""
        : "",
    base:
      template?.rules[0]?.effect.kind === "commission"
        ? template.rules[0].effect.base
        : ("item_subtotal" as const),
    sellerBps:
      template?.rules[0]?.effect.kind === "commission"
        ? template.rules[0].effect.allocation.sellerBps
        : 10_000,
    buyerBps:
      template?.rules[0]?.effect.kind === "commission"
        ? template.rules[0].effect.allocation.buyerBps
        : 0,
    absorbedBps:
      template?.rules[0]?.effect.kind === "commission"
        ? template.rules[0].effect.allocation.platformAbsorbedBps
        : 0,
    priority: template?.rules[0]?.priority || 500,
    rolloutBps: template?.rolloutBps ?? 10_000,
    earningEvent:
      templateEffect?.kind === "commission"
        ? templateEffect.earningEvent
        : ("payment_succeeded" as
            | "payment_succeeded"
            | "order_completed"
            | "service_completed"
            | "payout_released"
            | "lead_qualified"
            | "booking_completed"),
    refundPolicy:
      templateEffect?.kind === "commission"
        ? templateEffect.refundPolicy
        : ("proportional" as
            "proportional" | "full_only" | "non_refundable" | "manual_review"),
    taxMode:
      templateEffect?.kind === "commission"
        ? templateEffect.tax.mode
        : ("inclusive" as "inclusive" | "exclusive" | "exempt"),
    taxRateBps:
      templateEffect?.kind === "commission"
        ? templateEffect.tax.rateBps
        : 2_000,
    effectiveFrom: "",
    effectiveUntil: "",
    reason: "Création d’une politique de commission contrôlée",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildModel(): CommissionModel {
    const bounds = {
      ...(form.minimumMinor === ""
        ? {}
        : { minimumMinor: Number(form.minimumMinor) }),
      ...(form.maximumMinor === ""
        ? {}
        : { maximumMinor: Number(form.maximumMinor) }),
    };
    if (form.modelType === "fixed") {
      return { type: "fixed", fixedMinor: form.fixedMinor, ...bounds };
    }
    if (form.modelType === "flat_category") {
      return {
        type: "flat_category",
        fixedMinor: form.fixedMinor,
        ...bounds,
      };
    }
    if (form.modelType === "combined") {
      return {
        type: "combined",
        rateBps: form.rateBps,
        fixedMinor: form.fixedMinor,
        ...bounds,
      };
    }
    if (form.modelType === "threshold") {
      return {
        type: "threshold",
        thresholdMinor: form.thresholdMinor,
        appliesWhen: form.thresholdApplies,
        rateBps: form.rateBps,
        fixedMinor: form.fixedMinor,
        ...bounds,
      };
    }
    if (form.modelType === "tiered") {
      return {
        type: "tiered",
        tierMode: form.tierMode,
        basis: form.tierBasis,
        volumePeriod:
          form.tierBasis === "historical_volume"
            ? form.volumePeriod
            : undefined,
        tiers: parseTiers(form.tiers),
        ...bounds,
      };
    }
    return { type: "percentage", rateBps: form.rateBps, ...bounds };
  }

  function buildEffect(): CommissionEffect {
    if (form.policyType === "adjustment") {
      const adjustment =
        form.adjustmentType === "percentage_discount"
          ? { type: "percentage_discount" as const, discountBps: form.rateBps }
          : form.adjustmentType === "fixed_discount"
            ? { type: "fixed_discount" as const, amountMinor: form.fixedMinor }
            : form.adjustmentType === "full_waiver"
              ? { type: "full_waiver" as const }
              : form.adjustmentType === "rate_override"
                ? { type: "rate_override" as const, rateBps: form.rateBps }
                : {
                    type: "fixed_override" as const,
                    amountMinor: form.fixedMinor,
                  };
      return {
        kind: "adjustment",
        adjustment,
        stackingPolicy: form.stackingPolicy,
        promotionId: form.promotionId.trim() || undefined,
      };
    }
    return {
      kind: "commission",
      base: form.base,
      model: buildModel(),
      allocation: {
        sellerBps: form.sellerBps,
        buyerBps: form.buyerBps,
        platformAbsorbedBps: form.absorbedBps,
      },
      tax: {
        mode: form.taxMode,
        rateBps: form.taxMode === "exempt" ? 0 : form.taxRateBps,
      },
      roundingMode: "half_up",
      earningEvent: form.earningEvent,
      refundPolicy: form.refundPolicy,
    };
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const values = form.scopeValues
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      const scope: CommissionScope = {
        ...EMPTY_SCOPE,
        marketCodes: [catalog.marketCode],
        currencies: [catalog.currency],
      };
      if (form.scopeLevel !== "global") {
        (scope[form.scopeLevel] as string[]) = values;
      }
      const suffix = `${catalog.versionNumber + 1}-${Date.now().toString(36)}`;
      const policyId = `commission-policy-${suffix}`;
      const ruleId = `commission-rule-${suffix}`;
      const effectiveFrom = form.effectiveFrom
        ? new Date(form.effectiveFrom).toISOString()
        : undefined;
      const effectiveUntil = form.effectiveUntil
        ? new Date(form.effectiveUntil).toISOString()
        : undefined;
      const policy: CommissionPolicy = {
        id: policyId,
        code: form.code
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_.-]+/g, "-"),
        versionId: catalog.configurationVersionId,
        versionNumber: catalog.versionNumber + 1,
        name: form.name.trim(),
        description: form.description.trim(),
        policyType: form.policyType,
        status: "draft",
        effectiveFrom,
        effectiveUntil,
        rolloutBps: form.rolloutBps,
        rules: [
          {
            id: ruleId,
            policyId,
            versionId: catalog.configurationVersionId,
            name: form.name.trim(),
            description: form.description.trim(),
            priority: form.priority,
            scope,
            effect: buildEffect(),
            effectiveFrom,
            effectiveUntil,
          },
        ],
      };
      const version = await services.commissions.createDraft({
        policies: [...catalog.commissionPolicies, policy],
        reason: form.reason,
        effectiveFrom,
      });
      onCreated(version);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Brouillon invalide.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={template ? "Cloner la politique" : "Créer une politique"}
      description={t(
        "admin.adminCommissionPolicyEditor.laModificationCreeUneNouvelleVersionSoumiseAuWorkflowMaker",
      )}
      maxWidth="xl"
    >
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Nom" required>
            <Input
              required
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </FormField>
          <FormField label="Code stable" required>
            <Input
              required
              pattern="[a-z0-9_.-]+"
              value={form.code}
              onChange={(event) =>
                setForm((current) => ({ ...current, code: event.target.value }))
              }
            />
          </FormField>
        </div>
        <FormField label="Description" required>
          <Textarea
            required
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />
        </FormField>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField
            label={t("admin.adminCommissionPolicyEditor.typeDePolitique")}
            required
          >
            <Select
              className="w-full"
              labelledByAncestor
              value={form.policyType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  policyType: event.target.value as typeof current.policyType,
                }))
              }
            >
              <option value="base">
                {t("admin.adminCommissionPolicyEditor.commissionDeBase")}
              </option>
              <option value="adjustment">Avantage / promotion</option>
            </Select>
          </FormField>
          <FormField
            label={t("admin.crmTasksPage.priorite")}
            hint="Départage une portée identique."
          >
            <Input
              type="number"
              min={MONETIZATION_ADMIN_CONSTRAINTS.priority.min}
              max={MONETIZATION_ADMIN_CONSTRAINTS.priority.max}
              step={MONETIZATION_ADMIN_CONSTRAINTS.priority.step}
              value={form.priority}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  priority: Number(event.target.value),
                }))
              }
            />
          </FormField>
          <FormField
            label={t("admin.adminCommissionPolicyEditor.deploiementBps")}
            hint="10 000 = 100 %."
          >
            <Input
              type="number"
              min={MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.min}
              max={MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.max}
              step={MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.step}
              value={form.rolloutBps}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  rolloutBps: Number(event.target.value),
                }))
              }
            />
          </FormField>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            label={t("admin.adminCommissionPolicyEditor.niveauDeDerogation")}
            required
          >
            <Select
              className="w-full"
              labelledByAncestor
              value={form.scopeLevel}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  scopeLevel: event.target.value as ScopeLevel,
                }))
              }
            >
              <option value="global">
                {t("admin.adminCommissionPolicyEditor.defautDuMarche")}
              </option>
              <option value="countryCodes">Pays</option>
              <option value="verticalIds">Verticale</option>
              <option value="categoryIds">
                {t("admin.adminCommissionPolicyEditor.categorieListePossible")}
              </option>
              <option value="subcategoryIds">
                {t("search.searchPage.sousCategorie")}
              </option>
              <option value="transactionTypes">
                {t("admin.adminCommissionPolicyEditor.typeDeTransaction")}
              </option>
              <option value="sellerTypes">
                {t("admin.adminCommissionPanel.typeVendeur")}
              </option>
              <option value="planIds">Forfait</option>
              <option value="organizationIds">Organisation</option>
              <option value="accountIds">{t("nav.account")}</option>
              <option value="campaignIds">Campagne</option>
            </Select>
          </FormField>
          <FormField
            label={t("admin.adminCommissionPolicyEditor.valeursDePortee")}
            hint="Séparez plusieurs catégories par une virgule."
          >
            <Input
              disabled={form.scopeLevel === "global"}
              required={form.scopeLevel !== "global"}
              value={form.scopeValues}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  scopeValues: event.target.value,
                }))
              }
            />
          </FormField>
        </div>
        {form.policyType === "base" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField
                label={t("admin.adminCommissionPolicyEditor.modele")}
                required
              >
                <Select
                  className="w-full"
                  labelledByAncestor
                  value={form.modelType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      modelType: event.target.value as typeof current.modelType,
                    }))
                  }
                >
                  <option value="percentage">Pourcentage</option>
                  <option value="fixed">Fixe</option>
                  <option value="combined">Pourcentage + fixe</option>
                  <option value="flat_category">
                    {t("admin.adminCommissionPolicyEditor.forfaitCategorie")}
                  </option>
                  <option value="threshold">Seuil</option>
                  <option value="tiered">Paliers</option>
                </Select>
              </FormField>
              <FormField label="Taux (bps)">
                <Input
                  type="number"
                  min={MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.min}
                  max={MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.max}
                  step={MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.step}
                  disabled={
                    form.modelType === "fixed" ||
                    form.modelType === "flat_category" ||
                    form.modelType === "tiered"
                  }
                  value={form.rateBps}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      rateBps: Number(event.target.value),
                    }))
                  }
                />
              </FormField>
              <FormField label="Fixe (minor)">
                <Input
                  type="number"
                  min={MONETIZATION_ADMIN_CONSTRAINTS.moneyMinor.min}
                  step={MONETIZATION_ADMIN_CONSTRAINTS.moneyMinor.step}
                  disabled={
                    form.modelType === "percentage" ||
                    form.modelType === "tiered"
                  }
                  value={form.fixedMinor}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      fixedMinor: Number(event.target.value),
                    }))
                  }
                />
              </FormField>
            </div>
            {form.modelType === "threshold" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Seuil (minor)" required>
                  <Input
                    type="number"
                    min={MONETIZATION_ADMIN_CONSTRAINTS.moneyMinor.min}
                    step={MONETIZATION_ADMIN_CONSTRAINTS.moneyMinor.step}
                    value={form.thresholdMinor}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        thresholdMinor: Number(event.target.value),
                      }))
                    }
                  />
                </FormField>
                <FormField label="Condition" required>
                  <Select
                    className="w-full"
                    labelledByAncestor
                    value={form.thresholdApplies}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        thresholdApplies: event.target
                          .value as typeof current.thresholdApplies,
                      }))
                    }
                  >
                    <option value="at_or_above">
                      {t("admin.adminCommissionPolicyEditor.auMoinsLeSeuil")}
                    </option>
                    <option value="above">
                      {t(
                        "admin.adminCommissionPolicyEditor.strictementAuDessus",
                      )}
                    </option>
                    <option value="below">
                      {t("admin.adminCommissionPolicyEditor.sousLeSeuil")}
                    </option>
                  </Select>
                </FormField>
              </div>
            )}
            {form.modelType === "tiered" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  label={t("admin.adminCommissionPolicyEditor.modeDesPaliers")}
                  required
                >
                  <Select
                    className="w-full"
                    labelledByAncestor
                    value={form.tierMode}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        tierMode: event.target.value as typeof current.tierMode,
                      }))
                    }
                  >
                    <option value="progressive">Progressif</option>
                    <option value="cliff">Cliff</option>
                  </Select>
                </FormField>
                <FormField
                  label={t("admin.adminCommissionPolicyEditor.baseDesPaliers")}
                  required
                >
                  <Select
                    className="w-full"
                    labelledByAncestor
                    value={form.tierBasis}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        tierBasis: event.target
                          .value as typeof current.tierBasis,
                      }))
                    }
                  >
                    <option value="transaction_amount">
                      {t(
                        "admin.adminCommissionPolicyEditor.montantDeLaTransaction",
                      )}
                    </option>
                    <option value="historical_volume">
                      {t("admin.adminCommissionPolicyEditor.volumeCumule")}
                    </option>
                  </Select>
                </FormField>
                {form.tierBasis === "historical_volume" && (
                  <FormField
                    label={t(
                      "admin.adminCommissionPolicyEditor.periodeDeVolume",
                    )}
                    required
                  >
                    <Select
                      className="w-full"
                      labelledByAncestor
                      value={form.volumePeriod}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          volumePeriod: event.target
                            .value as typeof current.volumePeriod,
                        }))
                      }
                    >
                      <option value="month">Mois</option>
                      <option value="quarter">Trimestre</option>
                      <option value="year">
                        {t("admin.adminCommissionPolicyEditor.annee")}
                      </option>
                      <option value="lifetime">
                        {t("admin.adminCommissionPolicyEditor.dureeDeVie")}
                      </option>
                    </Select>
                  </FormField>
                )}
                <FormField
                  label="Paliers"
                  hint="Une ligne par palier : début-fin:tauxBps:fixeMinor. Utilisez * pour le dernier plafond."
                  required
                >
                  <Textarea
                    required
                    value={form.tiers}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        tiers: event.target.value,
                      }))
                    }
                  />
                </FormField>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Minimum (minor)">
                <Input
                  type="number"
                  min={MONETIZATION_ADMIN_CONSTRAINTS.moneyMinor.min}
                  step={MONETIZATION_ADMIN_CONSTRAINTS.moneyMinor.step}
                  value={form.minimumMinor}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      minimumMinor: event.target.value,
                    }))
                  }
                />
              </FormField>
              <FormField label="Maximum (minor)">
                <Input
                  type="number"
                  min={MONETIZATION_ADMIN_CONSTRAINTS.moneyMinor.min}
                  step={MONETIZATION_ADMIN_CONSTRAINTS.moneyMinor.step}
                  value={form.maximumMinor}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      maximumMinor: event.target.value,
                    }))
                  }
                />
              </FormField>
              <FormField label="Base" required>
                <Select
                  className="w-full"
                  labelledByAncestor
                  value={form.base}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      base: event.target.value as typeof current.base,
                    }))
                  }
                >
                  <option value="item_subtotal">Sous-total article</option>
                  <option value="subtotal_after_discount">
                    {t("admin.adminCommissionPolicyEditor.apresRemise")}
                  </option>
                  <option value="total_excluding_tax">Total hors taxe</option>
                  <option value="total_including_tax">Total TTC</option>
                  <option value="platform_collected_amount">
                    {t("admin.adminCommissionPolicyEditor.encaissePlateforme")}
                  </option>
                </Select>
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                label={t(
                  "admin.adminCommissionPolicyEditor.evenementDAcquisition",
                )}
                required
              >
                <Select
                  className="w-full"
                  labelledByAncestor
                  value={form.earningEvent}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      earningEvent: event.target
                        .value as typeof current.earningEvent,
                    }))
                  }
                >
                  <option value="payment_succeeded">
                    {t("admin.adminCommissionPolicyEditor.paiementReussi")}
                  </option>
                  <option value="order_completed">
                    {t("admin.adminCommissionPolicyEditor.commandeTerminee")}
                  </option>
                  <option value="service_completed">
                    {t("admin.adminCommissionPolicyEditor.serviceTermine")}
                  </option>
                  <option value="payout_released">
                    {t("admin.adminCommissionPolicyEditor.virementLibere")}
                  </option>
                  <option value="lead_qualified">
                    {t("admin.adminCommissionPolicyEditor.leadQualifie")}
                  </option>
                  <option value="booking_completed">
                    {t("admin.adminCommissionPolicyEditor.reservationTerminee")}
                  </option>
                </Select>
              </FormField>
              <FormField
                label={t(
                  "admin.adminCommissionPolicyEditor.politiqueDeRemboursement",
                )}
                required
              >
                <Select
                  className="w-full"
                  labelledByAncestor
                  value={form.refundPolicy}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      refundPolicy: event.target
                        .value as typeof current.refundPolicy,
                    }))
                  }
                >
                  <option value="proportional">Proportionnelle</option>
                  <option value="full_only">
                    Remboursement total seulement
                  </option>
                  <option value="non_refundable">
                    {t("admin.adminCommissionPolicyEditor.commissionConservee")}
                  </option>
                  <option value="manual_review">Revue manuelle</option>
                </Select>
              </FormField>
              <FormField label="Traitement fiscal" required>
                <Select
                  className="w-full"
                  labelledByAncestor
                  value={form.taxMode}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      taxMode: event.target.value as typeof current.taxMode,
                    }))
                  }
                >
                  <option value="inclusive">Taxe incluse</option>
                  <option value="exclusive">
                    {t("admin.adminCommissionPolicyEditor.taxeAjoutee")}
                  </option>
                  <option value="exempt">
                    {t("admin.adminCommissionPolicyEditor.exoneree")}
                  </option>
                </Select>
              </FormField>
              <FormField label="Taux fiscal (bps)">
                <Input
                  type="number"
                  min={MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.min}
                  max={MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.max}
                  step={MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.step}
                  disabled={form.taxMode === "exempt"}
                  value={form.taxRateBps}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      taxRateBps: Number(event.target.value),
                    }))
                  }
                />
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Part vendeur (bps)", "sellerBps"],
                ["Part acheteur (bps)", "buyerBps"],
                ["Absorbée plateforme (bps)", "absorbedBps"],
              ].map(([label, key]) => (
                <FormField key={key} label={label} required>
                  <Input
                    type="number"
                    min={MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.min}
                    max={MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.max}
                    step={MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.step}
                    value={
                      form[key as "sellerBps" | "buyerBps" | "absorbedBps"]
                    }
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [key]: Number(event.target.value),
                      }))
                    }
                  />
                </FormField>
              ))}
            </div>
          </>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="Avantage" required>
              <Select
                className="w-full"
                labelledByAncestor
                value={form.adjustmentType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    adjustmentType: event.target.value as AdjustmentType,
                  }))
                }
              >
                <option value="percentage_discount">
                  Remise en pourcentage
                </option>
                <option value="fixed_discount">Remise fixe</option>
                <option value="full_waiver">
                  {t("admin.adminCommissionPolicyEditor.exonerationTotale")}
                </option>
                <option value="rate_override">
                  {t("admin.adminCommissionPolicyEditor.tauxNegocie")}
                </option>
                <option value="fixed_override">
                  {t("admin.adminCommissionPolicyEditor.montantNegocie")}
                </option>
              </Select>
            </FormField>
            <FormField label="Taux (bps)">
              <Input
                type="number"
                min={MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.min}
                max={MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.max}
                step={MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.step}
                disabled={
                  form.adjustmentType !== "percentage_discount" &&
                  form.adjustmentType !== "rate_override"
                }
                value={form.rateBps}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    rateBps: Number(event.target.value),
                  }))
                }
              />
            </FormField>
            <FormField label="Montant (minor)">
              <Input
                type="number"
                min={MONETIZATION_ADMIN_CONSTRAINTS.moneyMinor.min}
                step={MONETIZATION_ADMIN_CONSTRAINTS.moneyMinor.step}
                disabled={
                  form.adjustmentType !== "fixed_discount" &&
                  form.adjustmentType !== "fixed_override"
                }
                value={form.fixedMinor}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    fixedMinor: Number(event.target.value),
                  }))
                }
              />
            </FormField>
            <FormField label="Cumul" required>
              <Select
                className="w-full"
                labelledByAncestor
                value={form.stackingPolicy}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    stackingPolicy: event.target
                      .value as typeof current.stackingPolicy,
                  }))
                }
              >
                <option value="exclusive">Exclusive</option>
                <option value="best_price">Meilleur avantage</option>
                <option value="stackable">Cumulable</option>
              </Select>
            </FormField>
            <FormField
              label="Promotion existante"
              hint="L’identifiant est validé contre le catalogue Promotions."
            >
              <Input
                value={form.promotionId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    promotionId: event.target.value,
                  }))
                }
              />
            </FormField>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            label={t("admin.adminCommissionPolicyEditor.debutEffectif")}
          >
            <Input
              type="datetime-local"
              value={form.effectiveFrom}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  effectiveFrom: event.target.value,
                }))
              }
            />
          </FormField>
          <FormField label="Fin effective">
            <Input
              type="datetime-local"
              value={form.effectiveUntil}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  effectiveUntil: event.target.value,
                }))
              }
            />
          </FormField>
        </div>
        <FormField label="Motif auditable" required>
          <Textarea
            required
            minLength={MONETIZATION_ADMIN_CONSTRAINTS.changeReason.minLength}
            maxLength={MONETIZATION_ADMIN_CONSTRAINTS.changeReason.maxLength}
            value={form.reason}
            onChange={(event) =>
              setForm((current) => ({ ...current, reason: event.target.value }))
            }
          />
        </FormField>
        {error && (
          <p role="alert" className="text-xs font-semibold text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" isLoading={saving}>
            {t("admin.adminCommissionPolicyEditor.creerLeBrouillon")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
