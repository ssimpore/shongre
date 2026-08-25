import React, { useMemo, useState } from "react";
import type {
  CommissionCalculation,
  CommercialConfigurationVersion,
  CommissionPolicy,
  MonetizationCatalog,
} from "@shongre/contracts/monetization";
import {
  Calculator,
  CircleDollarSign,
  Copy,
  Plus,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { services } from "../../api";
import { Badge } from "../../design-system/primitives/Badge";
import { Button } from "../../design-system/primitives/Button";
import { Input } from "../../design-system/primitives/FormField";
import { useAuthorization } from "../../security/useAuthorization";
import { AdminCommissionPolicyEditor } from "./AdminCommissionPolicyEditor";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useRegionalFormatters } from "../../hooks/useRegionalFormatters";

function modelLabel(policy: CommissionPolicy) {
  const effect = policy.rules[0]?.effect;
  if (!effect) return "Aucune règle";
  if (effect.kind === "adjustment") {
    if (effect.adjustment.type === "percentage_discount")
      return `Remise ${effect.adjustment.discountBps / 100} %`;
    if (effect.adjustment.type === "fixed_discount")
      return `Remise fixe ${effect.adjustment.amountMinor} minor`;
    if (effect.adjustment.type === "full_waiver") return "Exonération totale";
    if (effect.adjustment.type === "rate_override")
      return `Taux remplacé par ${effect.adjustment.rateBps / 100} %`;
    return `Montant remplacé par ${effect.adjustment.amountMinor} minor`;
  }
  const model = effect.model;
  if (model.type === "percentage") return `${model.rateBps / 100} %`;
  if (model.type === "fixed" || model.type === "flat_category")
    return `${model.fixedMinor} minor fixe`;
  if (model.type === "combined")
    return `${model.rateBps / 100} % + ${model.fixedMinor} minor`;
  if (model.type === "tiered")
    return `${model.tiers.length} paliers · ${model.tierMode}`;
  return `Seuil ${model.thresholdMinor} minor`;
}

function scopeLabel(policy: CommissionPolicy) {
  const scope = policy.rules[0]?.scope;
  if (!scope) return "Globale";
  const values = [
    ...scope.accountIds.map((value) => `Compte ${value}`),
    ...scope.organizationIds.map((value) => `Organisation ${value}`),
    ...scope.campaignIds.map((value) => `Campagne ${value}`),
    ...scope.planIds.map((value) => `Forfait ${value}`),
    ...scope.subcategoryIds.map((value) => `Sous-catégorie ${value}`),
    ...scope.categoryIds.map((value) => `Catégorie ${value}`),
    ...scope.verticalIds.map((value) => `Verticale ${value}`),
    ...scope.sellerTypes.map((value) => `Vendeur ${value}`),
    ...scope.countryCodes.map((value) => `Pays ${value}`),
  ];
  return values.join(" · ") || "Globale";
}

interface AdminCommissionPanelProps {
  catalog: MonetizationCatalog;
}

export function AdminCommissionPanel({ catalog }: AdminCommissionPanelProps) {
  const { activeMarket } = useMarketLocation();
  const { formatMoneyMinor } = useRegionalFormatters();
  const { can } = useAuthorization();
  const [input, setInput] = useState({
    countryCode: activeMarket.countryCode,
    marketCode: activeMarket.code,
    verticalId: "general",
    categoryId: "",
    sellerType: "professional" as
      "individual" | "professional" | "organization",
    planId: "",
    transactionType: "marketplace_order" as const,
    amount: "100.00",
    effectiveAt: "2026-08-24T12:00",
  });
  const [result, setResult] = useState<CommissionCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [template, setTemplate] = useState<CommissionPolicy | null>(null);
  const [draftVersion, setDraftVersion] =
    useState<CommercialConfigurationVersion | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const ruleCount = useMemo(
    () =>
      catalog.commissionPolicies.reduce(
        (count, policy) => count + policy.rules.length,
        0,
      ),
    [catalog.commissionPolicies],
  );
  const statistics: Array<{
    label: string;
    value: number;
    Icon: LucideIcon;
  }> = [
    {
      label: "Politiques",
      value: catalog.commissionPolicies.length,
      Icon: CircleDollarSign,
    },
    { label: "Règles versionnées", value: ruleCount, Icon: ShieldCheck },
    {
      label: "Actives",
      value: catalog.commissionPolicies.filter(
        (policy) => policy.status === "active",
      ).length,
      Icon: Calculator,
    },
  ];

  async function simulate(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const itemSubtotalMinor = Math.max(
        0,
        Math.round(Number(input.amount.replace(",", ".")) * 100),
      );
      const calculation = await services.commissions.preview({
        eligibleCommercialEvent: true,
        earningEvent: "payment_succeeded",
        effectiveAt: new Date(input.effectiveAt).toISOString(),
        marketCode: input.marketCode,
        countryCode: input.countryCode,
        currency: catalog.currency,
        verticalId: input.verticalId || undefined,
        categoryId: input.categoryId || undefined,
        transactionType: input.transactionType,
        sellerType: input.sellerType,
        planId: input.planId || undefined,
        campaignIds: [],
        itemSubtotalMinor,
        discountMinor: 0,
        shippingMinor: 0,
        taxMinor: 0,
        buyerFeesMinor: 0,
        totalMinor: itemSubtotalMinor,
        platformCollectedMinor: itemSubtotalMinor,
        historicalVolumeMinor: 0,
      });
      setResult(calculation);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Simulation indisponible.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitDraft() {
    if (!draftVersion) return;
    setTransitioning(true);
    setError(null);
    try {
      const version = await services.commissions.transitionVersion(
        draftVersion.id,
        "submit",
        "Soumission de la politique de commission à contrôle finance",
      );
      setDraftVersion(version);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Transition impossible.",
      );
    } finally {
      setTransitioning(false);
    }
  }

  async function disablePolicy(policyId: string) {
    setTransitioning(true);
    setError(null);
    try {
      const version = await services.commissions.createDraft({
        policies: catalog.commissionPolicies.map((policy) =>
          policy.id === policyId ? { ...policy, status: "disabled" } : policy,
        ),
        reason: `Désactivation contrôlée de la politique ${policyId}`,
      });
      setDraftVersion(version);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Création du brouillon de désactivation impossible.",
      );
    } finally {
      setTransitioning(false);
    }
  }

  return (
    <div className="p-4 space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {statistics.map(({ label, value, Icon }) => (
          <div
            key={label}
            className="rounded-lg border border-border-base bg-bg-subtle p-3"
          >
            <div className="flex items-center gap-2 text-micro font-bold uppercase tracking-wide text-stone-500">
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </div>
            <div className="mt-1 text-xl font-black text-stone-950">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-success-border bg-success-surface p-3 text-xs text-stone-700">
        <strong>Défaut sûr :</strong> aucune commission n’est prélevée sans
        politique active, contexte éligible et événement d’acquisition atteint.
        Une simple annonce publiée ne déclenche jamais de commission.
      </div>

      {draftVersion && (
        <div className="flex flex-col gap-3 rounded-lg border border-warning-border bg-warning-surface p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
          <div>
            <strong>{draftVersion.id}</strong> · statut {draftVersion.status}.
            {draftVersion.status === "pending_approval" &&
              " Un autre acteur autorisé doit approuver puis publier cette version."}
          </div>
          {draftVersion.status === "draft" && (
            <Button
              size="sm"
              onClick={() => void submitDraft()}
              isLoading={transitioning}
            >
              Soumettre à approbation
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-commission-content-aside">
        <form
          onSubmit={(event) => void simulate(event)}
          className="rounded-lg border border-border-base p-4"
        >
          <div className="mb-4">
            <h2 className="text-sm font-black text-stone-950">
              Simulateur de commission
            </h2>
            <p className="mt-1 text-micro text-stone-500">
              Utilise exactement le même résolveur que le checkout et la
              comptabilisation serveur.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-stone-700">
              Montant
              <Input
                className="mt-1"
                inputMode="decimal"
                value={input.amount}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
              />
            </label>
            <label className="text-xs font-bold text-stone-700">
              Date effective
              <Input
                className="mt-1"
                type="datetime-local"
                value={input.effectiveAt}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    effectiveAt: event.target.value,
                  }))
                }
              />
            </label>
            <label className="text-xs font-bold text-stone-700">
              Type vendeur
              <select
                className="mt-1 h-control-touch w-full rounded-control border border-border-base bg-bg-surface px-3"
                value={input.sellerType}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    sellerType: event.target.value as typeof current.sellerType,
                  }))
                }
              >
                <option value="individual">Particulier</option>
                <option value="professional">Professionnel</option>
                <option value="organization">Organisation</option>
              </select>
            </label>
            <label className="text-xs font-bold text-stone-700">
              Verticale
              <select
                className="mt-1 h-control-touch w-full rounded-control border border-border-base bg-bg-surface px-3"
                value={input.verticalId}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    verticalId: event.target.value,
                  }))
                }
              >
                {catalog.verticals.map((vertical) => (
                  <option key={vertical.id} value={vertical.id}>
                    {vertical.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-stone-700">
              Catégorie (identifiant)
              <Input
                className="mt-1"
                value={input.categoryId}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    categoryId: event.target.value,
                  }))
                }
                placeholder="Optionnel"
              />
            </label>
            <label className="text-xs font-bold text-stone-700">
              Forfait (identifiant)
              <Input
                className="mt-1"
                value={input.planId}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    planId: event.target.value,
                  }))
                }
                placeholder="Optionnel"
              />
            </label>
          </div>
          {error && (
            <p className="mt-3 text-xs font-semibold text-danger" role="alert">
              {error}
            </p>
          )}
          <Button className="mt-4" type="submit" isLoading={loading}>
            <Calculator className="h-4 w-4" /> Simuler
          </Button>
        </form>

        <section
          className="rounded-lg border border-border-base p-4"
          aria-live="polite"
        >
          <h2 className="text-sm font-black text-stone-950">Résultat</h2>
          {!result ? (
            <p className="mt-3 text-xs text-stone-500">
              Renseignez le contexte pour voir la politique, le calcul et sa
              justification.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Badge variant={result.eligible ? "success" : "neutral"}>
                  {result.eligible
                    ? "Commission applicable"
                    : "Aucune commission"}
                </Badge>
                <span className="font-mono text-micro text-stone-500">
                  {result.snapshotHash}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                {[
                  ["Base", result.baseAmountMinor],
                  ["Commission brute", result.grossCommissionMinor],
                  ["Remise/exonération", result.adjustmentMinor],
                  ["TVA commission", result.commissionTaxMinor],
                  ["Retenue vendeur", result.sellerChargeMinor],
                  ["Net vendeur", result.sellerPayableMinor],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt className="text-stone-500">{label}</dt>
                    <dd className="font-black text-stone-900">
                      {formatMoneyMinor(Number(value), result.currency)}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="rounded-control bg-bg-subtle p-3 text-xs">
                <div className="font-bold text-stone-900">
                  {result.appliedPolicyId || "Défaut sûr"}
                </div>
                <div className="mt-1 text-stone-600">{result.reasonCode}</div>
                <ul className="mt-2 space-y-1 text-micro text-stone-500">
                  {result.explanation
                    .filter((entry) => entry.matched)
                    .map((entry) => (
                      <li key={`${entry.policyId}:${entry.ruleId}`}>
                        {entry.policyName} · {entry.ruleName} · précédence{" "}
                        {entry.precedence}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-black text-stone-950">
            Politiques du catalogue publié
          </h2>
          <Button
            size="sm"
            disabled={!can("commissions.manage")}
            onClick={() => {
              setTemplate(null);
              setEditorOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Nouvelle politique
          </Button>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {catalog.commissionPolicies.map((policy) => (
            <article
              key={policy.id}
              className="rounded-lg border border-border-base p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black text-stone-950">
                    {policy.name}
                  </h3>
                  <p className="mt-1 font-mono text-micro text-stone-500">
                    {policy.code} · v{policy.versionNumber}
                  </p>
                </div>
                <Badge
                  variant={policy.status === "active" ? "success" : "neutral"}
                >
                  {policy.status === "active" ? "Active" : "Désactivée"}
                </Badge>
              </div>
              <p className="mt-3 text-xs text-stone-600">
                {policy.description}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-micro">
                <div>
                  <dt className="text-stone-500">Calcul</dt>
                  <dd className="font-bold text-stone-800">
                    {modelLabel(policy)}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">Portée / héritage</dt>
                  <dd className="font-bold text-stone-800">
                    {scopeLabel(policy)}
                  </dd>
                </div>
              </dl>
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                disabled={!can("commissions.manage")}
                onClick={() => {
                  setTemplate(policy);
                  setEditorOpen(true);
                }}
              >
                <Copy className="h-4 w-4" /> Cloner en brouillon
              </Button>
              {policy.status === "active" && (
                <Button
                  className="ml-2 mt-3"
                  size="sm"
                  variant="outline"
                  disabled={!can("commissions.manage") || transitioning}
                  onClick={() => void disablePolicy(policy.id)}
                >
                  Désactiver via brouillon
                </Button>
              )}
            </article>
          ))}
        </div>
      </section>
      {editorOpen && (
        <AdminCommissionPolicyEditor
          catalog={catalog}
          template={template}
          onClose={() => setEditorOpen(false)}
          onCreated={(version) => {
            setDraftVersion(version);
            setEditorOpen(false);
          }}
        />
      )}
    </div>
  );
}
