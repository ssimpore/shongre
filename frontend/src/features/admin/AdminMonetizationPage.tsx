import React, { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CommercialConfigurationVersion,
  MonetizationAdminOverview,
  MonetizationProduct,
  CommercialRuleOutcome,
  RuleEvaluationResult,
} from "@shongre/contracts/monetization";
import { CANONICAL_TAXONOMY_IDS } from "@shongre/contracts/taxonomy-catalog";
import {
  AlertTriangle,
  ArrowRight,
  BadgeEuro,
  CalendarClock,
  Check,
  ChevronRight,
  CircleGauge,
  Download,
  FileClock,
  Filter,
  GitCompareArrows,
  History,
  ListFilter,
  LoaderCircle,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { services } from "../../api";
import { Badge } from "../../design-system/primitives/Badge";
import { Button } from "../../design-system/primitives/Button";
import {
  FormField,
  Input,
  Textarea,
} from "../../design-system/primitives/FormField";
import { Modal } from "../../design-system/primitives/Modal";
import { usePageMeta } from "../../hooks/usePageMeta";
import { AdminDiscoveryConfigurationPanel } from "./AdminDiscoveryConfigurationPanel";
import { useTranslation } from "../../i18n/I18nProvider";
import { labelIdentifier } from "../../utilities/identifier-label";

type TabId =
  | "catalog"
  | "rules"
  | "plans"
  | "promotions"
  | "discovery"
  | "fees"
  | "operations"
  | "history";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "catalog", label: "Catalogue" },
  { id: "rules", label: "Règles" },
  { id: "plans", label: "Offres Pro" },
  { id: "promotions", label: "Promotions" },
  { id: "discovery", label: "" },
  { id: "fees", label: "Taxes & frais" },
  { id: "operations", label: "Opérations" },
  { id: "history", label: "Historique" },
];

const PRODUCT_KIND: Record<MonetizationProduct["kind"], string> = {
  standard_listing: "Publication standard",
  additional_listing: "Annonce supplémentaire",
  premium_option: "Option premium",
  subscription: "Abonnement",
  pack: "Pack",
  credit_pack: "Crédits",
  service_fee: "Frais de service",
  commission: "Commission",
  verification_service: "Vérification",
  sponsored_placement: "Placement sponsorisé",
};

function formatMinor(amountMinor: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

function statusLabel(status: CommercialConfigurationVersion["status"]) {
  return {
    draft: "Brouillon",
    pending_approval: "À approuver",
    approved: "Approuvée",
    scheduled: "Planifiée",
    active: "Publiée",
    disabled: "Désactivée",
    archived: "Archivée",
  }[status];
}

function formatRuleOutcomeValue(
  key: keyof CommercialRuleOutcome | string,
  value: unknown,
): string {
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "number") {
    if (key.endsWith("Minor")) return formatMinor(value);
    if (key.endsWith("Bps")) {
      return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value / 100)} %`;
    }
    if (key.endsWith("Days")) return `${value} jours`;
    return new Intl.NumberFormat("fr-FR").format(value);
  }
  if (Array.isArray(value)) return value.map(String).join(", ");
  return labelIdentifier(String(value));
}

export const AdminMonetizationPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: "Règles business et monétisation",
    description: "Administration versionnée du catalogue commercial Shongre.",
    canonicalPath: "/admin/monetisation",
    noIndex: true,
  });

  const [overview, setOverview] = useState<MonetizationAdminOverview | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("catalog");
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState("all");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [simulation, setSimulation] = useState({
    userType: "individual" as "individual" | "professional" | "organization",
    categoryId: CANONICAL_TAXONOMY_IDS.vehicles as string,
    usageLevel: 0,
  });
  const [evaluation, setEvaluation] = useState<RuleEvaluationResult | null>(
    null,
  );
  const [simulating, setSimulating] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftReason, setDraftReason] = useState("");
  const [draftAmountMinor, setDraftAmountMinor] = useState(0);
  const [draftEffectiveFrom, setDraftEffectiveFrom] = useState("");
  const [saving, setSaving] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await services.businessRules.getAdminOverview("FR");
      setOverview(result);
      setSelectedProductId(
        (current) => current || result.catalog.products[0]?.id || null,
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Chargement impossible.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const products = useMemo(() => {
    if (!overview) return [];
    return overview.catalog.products.filter((product) => {
      const tabMatches =
        tab === "catalog" ||
        (tab === "plans" && ["subscription", "pack"].includes(product.kind));
      const audienceMatches =
        audience === "all" ||
        product.audience === audience ||
        product.audience === "all";
      const queryMatches =
        `${product.name} ${product.code} ${product.description}`
          .toLowerCase()
          .includes(query.toLowerCase());
      return tabMatches && audienceMatches && queryMatches;
    });
  }, [audience, overview, query, tab]);

  const selectedProduct =
    overview?.catalog.products.find(
      (product) => product.id === selectedProductId,
    ) || null;
  const selectedPrice = selectedProduct?.prices[0];

  const runSimulation = async () => {
    setSimulating(true);
    setError(null);
    try {
      setEvaluation(
        await services.businessRules.evaluate({
          marketCode: "FR",
          currency: "EUR",
          userType: simulation.userType,
          categoryId: simulation.categoryId,
          publicationChannel: "web",
          usageLevel: simulation.usageLevel,
          featureFlags: [],
        }),
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Simulation impossible.",
      );
    } finally {
      setSimulating(false);
    }
  };

  const openEditor = () => {
    setDraftAmountMinor(selectedPrice?.amount.amountMinor || 0);
    setDraftReason("");
    setDraftEffectiveFrom("");
    setEditorOpen(true);
  };

  const createDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!overview || !selectedProduct || draftReason.trim().length < 8) return;
    setSaving(true);
    try {
      const updatedProducts = overview.catalog.products.map((product) =>
        product.id !== selectedProduct.id
          ? product
          : {
              ...product,
              prices: product.prices.map((price, index) =>
                index === 0
                  ? {
                      ...price,
                      amount: {
                        ...price.amount,
                        amountMinor: draftAmountMinor,
                      },
                    }
                  : price,
              ),
            },
      );
      const version = await services.businessRules.createDraft({
        reason: draftReason.trim(),
        effectiveFrom: draftEffectiveFrom
          ? new Date(draftEffectiveFrom).toISOString()
          : undefined,
        products: updatedProducts,
      });
      setNotice(
        `Brouillon v${version.versionNumber} créé. Aucun prix publié n’a changé.`,
      );
      setEditorOpen(false);
      await loadOverview();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Création du brouillon impossible.",
      );
    } finally {
      setSaving(false);
    }
  };

  const transition = async (
    version: CommercialConfigurationVersion,
    action: "submit" | "approve" | "publish" | "rollback",
  ) => {
    const reason = window
      .prompt(
        "Motif obligatoire (8 caractères minimum)",
        "Validation du catalogue commercial",
      )
      ?.trim();
    if (!reason || reason.length < 8) return;
    try {
      await services.businessRules.transitionVersion(
        version.id,
        action,
        reason,
      );
      setNotice(
        `Version v${version.versionNumber} : action « ${action} » enregistrée.`,
      );
      await loadOverview();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action impossible.");
    }
  };

  const exportCatalog = () => {
    if (!overview) return;
    const payload = JSON.stringify(overview.catalog, null, 2);
    const url = URL.createObjectURL(
      new Blob([payload], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${overview.catalog.configurationVersionId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !overview) {
    return (
      <div
        className="min-h-80 rounded-xl border border-border-base bg-bg-surface flex items-center justify-center"
        aria-live="polite"
      >
        <LoaderCircle className="w-5 h-5 animate-spin text-primary" />
        <span className="ml-2 text-sm font-semibold text-stone-700">
          Chargement du catalogue commercial…
        </span>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="rounded-xl border border-danger-border bg-danger-surface p-6">
        <h1 className="text-lg font-black text-stone-900">
          Catalogue indisponible
        </h1>
        <p className="mt-1 text-sm text-stone-700">{error}</p>
        <Button className="mt-4" size="sm" onClick={() => void loadOverview()}>
          Réessayer
        </Button>
      </div>
    );
  }

  const activeRules = overview.catalog.rules.filter(
    (rule) => rule.status === "active",
  );
  const matchedRules =
    evaluation?.explanation.filter((entry) => entry.matched) || [];

  return (
    <div className="space-y-4 pb-10">
      <section className="rounded-xl border border-border-base bg-bg-surface shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-micro font-black uppercase tracking-wider text-primary">
              <BadgeEuro className="w-4 h-4" /> Pilotage commercial
              <span className="text-stone-300">•</span>
              <span className="text-stone-500">France · EUR</span>
            </div>
            <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-stone-950">
              Business & Monétisation
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-stone-600 max-w-3xl">
              Une source versionnée pour les offres, prix, quotas, règles,
              taxes, commissions et promotions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-control border border-success-border bg-success-surface px-3 py-2">
              <div className="text-micro font-bold uppercase tracking-wide text-success">
                Version publiée
              </div>
              <div className="text-xs font-black text-stone-900">
                v{overview.publishedVersion.versionNumber} ·{" "}
                {overview.publishedVersion.productCount} produits
              </div>
            </div>
            <Button size="sm" onClick={openEditor} disabled={!selectedProduct}>
              <Plus className="w-4 h-4" /> Créer un brouillon
            </Button>
            <Button size="sm" variant="outline" onClick={exportCatalog}>
              <Download className="w-4 h-4" /> Exporter JSON
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-border-subtle bg-bg-subtle">
          {[
            {
              icon: ShieldCheck,
              label: "Configuration",
              value: overview.catalog.stale ? "Secours actif" : "À jour",
              tone: overview.catalog.stale ? "text-warning" : "text-stone-900",
            },
            {
              icon: CalendarClock,
              label: "Changements planifiés",
              value: String(overview.scheduledChanges),
              tone: "text-stone-900",
            },
            {
              icon: AlertTriangle,
              label: "Conflits bloquants",
              value: String(overview.conflictCount),
              tone: overview.conflictCount ? "text-danger" : "text-stone-900",
            },
            {
              icon: CircleGauge,
              label: "Règles actives",
              value: String(activeRules.length),
              tone: "text-stone-900",
            },
          ].map(({ icon: Icon, label, value, tone }) => (
            <div
              key={label}
              className="p-3 sm:px-4 flex items-center gap-2 border-r border-b lg:border-b-0 border-border-subtle last:border-r-0"
            >
              <Icon className={`w-4 h-4 shrink-0 ${tone}`} />
              <div className="min-w-0">
                <div className="text-micro text-stone-500 truncate">
                  {label}
                </div>
                <div className={`text-xs font-black ${tone}`}>{value}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {(notice || error) && (
        <div
          className={`rounded-control border px-3 py-2 text-xs font-semibold flex items-start gap-2 ${error ? "border-danger-border bg-danger-surface text-danger" : "border-success-border bg-success-surface text-success"}`}
          role="status"
        >
          {error ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <Check className="w-4 h-4 shrink-0" />
          )}
          <span>{error || notice}</span>
        </div>
      )}

      <section className="rounded-xl border border-border-base bg-bg-surface shadow-xs overflow-hidden">
        <div
          className="overflow-x-auto border-b border-border-subtle"
          aria-label="Sections de monétisation"
        >
          <div className="flex min-w-max px-2">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`h-control-touch px-3 text-xs font-bold border-b-2 focus-visible:outline-2 focus-visible:outline-primary ${tab === item.id ? "border-primary text-primary" : "border-transparent text-stone-600 hover:text-stone-950"}`}
                aria-current={tab === item.id ? "page" : undefined}
              >
                {item.id === "discovery"
                  ? t("admin.discovery.tab")
                  : item.label}
              </button>
            ))}
          </div>
        </div>

        {![
          "history",
          "rules",
          "promotions",
          "discovery",
          "fees",
          "operations",
        ].includes(tab) && (
          <div className="p-3 border-b border-border-subtle flex flex-col sm:flex-row gap-2">
            <label className="relative flex-1 min-w-0">
              <span className="sr-only">Rechercher une offre</span>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un produit, un code…"
                className="w-full h-control-touch rounded-control border border-border-base bg-bg-surface pl-9 pr-3 text-xs focus-visible:outline-2 focus-visible:outline-primary"
              />
            </label>
            <label className="flex items-center gap-2 rounded-control border border-border-base px-3 h-control-touch text-xs font-semibold text-stone-700">
              <Filter className="w-4 h-4" />
              <span className="sr-only">Audience</span>
              <select
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                className="bg-transparent focus:outline-none h-control-touch"
              >
                <option value="all">Toutes les audiences</option>
                <option value="individual">Particuliers</option>
                <option value="professional">Professionnels</option>
                <option value="organization">Organisations</option>
              </select>
            </label>
          </div>
        )}

        <div
          className={`grid min-h-96 ${tab === "discovery" ? "grid-cols-1" : "xl:grid-cols-[minmax(0,1fr)_340px]"}`}
        >
          <div
            className={`min-w-0 ${tab === "discovery" ? "" : "xl:border-r border-border-subtle"}`}
          >
            {(tab === "catalog" || tab === "plans") && (
              <div className="divide-y divide-border-subtle">
                <div className="hidden md:grid grid-cols-[minmax(220px,1fr)_130px_110px_110px_32px] gap-3 px-4 py-2 bg-bg-subtle text-micro font-black uppercase tracking-wide text-stone-500">
                  <span>Produit</span>
                  <span>Audience</span>
                  <span>Prix actif</span>
                  <span>État</span>
                  <span />
                </div>
                {products.map((product) => {
                  const price = product.prices[0];
                  const selected = product.id === selectedProductId;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => setSelectedProductId(product.id)}
                      className={`w-full text-left p-4 md:grid md:grid-cols-[minmax(220px,1fr)_130px_110px_110px_32px] md:items-center gap-3 hover:bg-bg-subtle focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary ${selected ? "bg-primary-light" : "bg-bg-surface"}`}
                    >
                      <span className="min-w-0">
                        <span className="block text-xs font-black text-stone-950 truncate">
                          {product.name}
                        </span>
                        <span className="block text-micro text-stone-500 truncate">
                          {PRODUCT_KIND[product.kind]} · {product.code}
                        </span>
                      </span>
                      <span className="mt-2 md:mt-0 inline-flex text-xs font-semibold text-stone-700 capitalize">
                        {product.audience === "all"
                          ? "Toutes"
                          : product.audience}
                      </span>
                      <span className="ml-3 md:ml-0 text-xs font-black text-stone-950">
                        {formatMinor(
                          price.amount.amountMinor,
                          price.amount.currency,
                        )}
                        {price.billingPeriod === "month" ? "/mois" : ""}
                      </span>
                      <span className="ml-3 md:ml-0">
                        <Badge
                          variant={
                            product.status === "active" ? "success" : "neutral"
                          }
                        >
                          {product.status === "active"
                            ? "Actif"
                            : statusLabel(product.status)}
                        </Badge>
                      </span>
                      <ChevronRight className="hidden md:block w-4 h-4 text-stone-400" />
                    </button>
                  );
                })}
                {products.length === 0 && (
                  <div className="p-8 text-center text-sm text-stone-500">
                    Aucune offre ne correspond aux filtres.
                  </div>
                )}
              </div>
            )}

            {tab === "rules" && (
              <div className="divide-y divide-border-subtle">
                {overview.catalog.rules.map((rule) => (
                  <article key={rule.id} className="p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-control bg-primary-light text-primary flex items-center justify-center shrink-0">
                      <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xs font-black text-stone-950">
                          {rule.name}
                        </h2>
                        <Badge
                          variant={
                            rule.status === "active" ? "success" : "neutral"
                          }
                        >
                          {statusLabel(rule.status)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-micro text-stone-500">
                        {rule.key} · priorité {rule.priority} ·{" "}
                        {rule.conditions.length} condition(s)
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(rule.outcome).map(([key, value]) => (
                          <span
                            key={key}
                            className="rounded bg-bg-subtle px-2 py-1 text-micro font-semibold text-stone-700"
                          >
                            {labelIdentifier(key)} :{" "}
                            {formatRuleOutcomeValue(key, value)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {tab === "promotions" && (
              <div className="p-4 grid sm:grid-cols-2 gap-3">
                {overview.catalog.promotions.map((promotion) => (
                  <article
                    key={promotion.id}
                    className="rounded-lg border border-border-base p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-black text-stone-950">
                        {promotion.name}
                      </h2>
                      <Badge>{statusLabel(promotion.status)}</Badge>
                    </div>
                    <div className="mt-2 font-mono text-xs font-bold text-primary">
                      {promotion.code}
                    </div>
                    <p className="mt-2 text-xs text-stone-600">
                      {promotion.discountType === "percentage"
                        ? `${promotion.discountValue / 100} %`
                        : formatMinor(promotion.discountValue)}{" "}
                      · {labelIdentifier(promotion.stackingPolicy)}
                    </p>
                  </article>
                ))}
              </div>
            )}

            {tab === "discovery" && <AdminDiscoveryConfigurationPanel />}

            {tab === "fees" && (
              <div className="divide-y divide-border-subtle">
                {overview.catalog.rules
                  .filter((rule) => /fee|commission|tax|range/.test(rule.key))
                  .map((rule) => (
                    <article
                      key={rule.id}
                      className="p-4 flex items-center justify-between gap-4"
                    >
                      <div>
                        <h2 className="text-xs font-black text-stone-950">
                          {rule.name}
                        </h2>
                        <p className="mt-1 text-micro text-stone-500">
                          {rule.scope.marketCodes.join(", ") || "Tous marchés"}{" "}
                          · priorité {rule.priority}
                        </p>
                      </div>
                      <div className="text-right">
                        {Object.entries(rule.outcome)
                          .filter(([key]) => key !== "reasonCode")
                          .map(([key, value]) => (
                            <div
                              key={key}
                              className="text-xs font-bold text-stone-800"
                            >
                              {labelIdentifier(key)} :{" "}
                              {formatRuleOutcomeValue(key, value)}
                            </div>
                          ))}
                      </div>
                    </article>
                  ))}
              </div>
            )}

            {tab === "operations" && (
              <div className="p-4 space-y-5">
                <div className="grid sm:grid-cols-2 xl:grid-cols-6 gap-3">
                  <div className="rounded-lg border border-border-base p-3">
                    <div className="text-micro text-stone-500">
                      Devis aujourd’hui
                    </div>
                    <div className="mt-1 text-lg font-black text-stone-950">
                      {overview.quoteCountToday}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border-base p-3">
                    <div className="text-micro text-stone-500">
                      Abonnements actifs
                    </div>
                    <div className="mt-1 text-lg font-black text-stone-950">
                      {overview.activeSubscriptionCount}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border-base p-3">
                    <div className="text-micro text-stone-500">
                      Droits matérialisés
                    </div>
                    <div className="mt-1 text-lg font-black text-stone-950">
                      {overview.entitlements.length}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border-base p-3">
                    <div className="text-micro text-stone-500">
                      Paiements réussis
                    </div>
                    <div className="mt-1 text-lg font-black text-stone-950">
                      {
                        overview.payments.filter(
                          (payment) => payment.status === "succeeded",
                        ).length
                      }
                    </div>
                  </div>
                  <div className="rounded-lg border border-border-base p-3">
                    <div className="text-micro text-stone-500">Factures</div>
                    <div className="mt-1 text-lg font-black text-stone-950">
                      {overview.invoices.length}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border-base p-3">
                    <div className="text-micro text-stone-500">
                      Remboursements
                    </div>
                    <div className="mt-1 text-lg font-black text-stone-950">
                      {overview.refunds.length}
                    </div>
                  </div>
                </div>
                <div>
                  <h2 className="text-xs font-black text-stone-950">
                    Registre financier
                  </h2>
                  <div className="mt-2 overflow-x-auto rounded-lg border border-border-base">
                    <table className="w-full min-w-[620px] text-xs">
                      <thead className="bg-bg-subtle text-left text-stone-600">
                        <tr>
                          <th className="px-3 py-2 font-bold" scope="col">
                            Référence
                          </th>
                          <th className="px-3 py-2 font-bold" scope="col">
                            Type
                          </th>
                          <th className="px-3 py-2 font-bold" scope="col">
                            Statut
                          </th>
                          <th
                            className="px-3 py-2 text-right font-bold"
                            scope="col"
                          >
                            Montant
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {overview.invoices.slice(0, 10).map((invoice) => (
                          <tr key={invoice.id}>
                            <td className="px-3 py-2 font-mono font-bold text-stone-900">
                              {invoice.number}
                            </td>
                            <td className="px-3 py-2 text-stone-600">
                              Facture
                            </td>
                            <td className="px-3 py-2 text-stone-600">
                              {labelIdentifier(invoice.status)}
                            </td>
                            <td className="px-3 py-2 text-right font-black text-stone-950">
                              {formatMinor(
                                invoice.total.amountMinor,
                                invoice.total.currency,
                              )}
                            </td>
                          </tr>
                        ))}
                        {overview.refunds.slice(0, 10).map((refund) => (
                          <tr key={refund.id}>
                            <td className="px-3 py-2 font-mono font-bold text-stone-900">
                              {refund.id}
                            </td>
                            <td className="px-3 py-2 text-stone-600">
                              Remboursement
                            </td>
                            <td className="px-3 py-2 text-stone-600">
                              {labelIdentifier(refund.status)}
                            </td>
                            <td className="px-3 py-2 text-right font-black text-stone-950">
                              −{" "}
                              {formatMinor(
                                refund.amount.amountMinor,
                                refund.amount.currency,
                              )}
                            </td>
                          </tr>
                        ))}
                        {overview.invoices.length === 0 &&
                          overview.refunds.length === 0 && (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-3 py-5 text-center text-stone-500"
                              >
                                Aucun mouvement financier à afficher.
                              </td>
                            </tr>
                          )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h2 className="text-xs font-black text-stone-950">
                    Commandes récentes
                  </h2>
                  <div className="mt-2 divide-y divide-border-subtle rounded-lg border border-border-base">
                    {overview.orders.map((order) => (
                      <div
                        key={order.id}
                        className="p-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-stone-900 truncate">
                            {order.id}
                          </div>
                          <div className="text-micro text-stone-500">
                            {labelIdentifier(order.provider)} ·{" "}
                            {labelIdentifier(order.status)}
                          </div>
                        </div>
                        <div className="font-black text-stone-950">
                          {formatMinor(
                            order.total.amountMinor,
                            order.total.currency,
                          )}
                        </div>
                      </div>
                    ))}
                    {overview.orders.length === 0 && (
                      <div className="p-4 text-xs text-stone-500">
                        Aucune commande centralisée.
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h2 className="text-xs font-black text-stone-950">
                    Audit récent
                  </h2>
                  <div className="mt-2 divide-y divide-border-subtle rounded-lg border border-border-base">
                    {overview.auditEvents.slice(0, 20).map((event) => (
                      <div key={event.id} className="p-3 text-xs">
                        <div className="font-bold text-stone-900">
                          {event.action} · {event.entityId}
                        </div>
                        <div className="mt-0.5 text-micro text-stone-500">
                          {event.actorName} ·{" "}
                          {new Date(event.createdAt).toLocaleString("fr-FR")} ·{" "}
                          {event.reason}
                        </div>
                      </div>
                    ))}
                    {overview.auditEvents.length === 0 && (
                      <div className="p-4 text-xs text-stone-500">
                        Aucun événement d’audit.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {tab === "history" && (
              <div className="divide-y divide-border-subtle">
                {overview.versions.map((version) => (
                  <article
                    key={version.id}
                    className="p-4 flex flex-col md:flex-row md:items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-control bg-bg-subtle flex items-center justify-center shrink-0">
                      <FileClock className="w-4 h-4 text-stone-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xs font-black text-stone-950">
                          Version {version.versionNumber}
                        </h2>
                        <Badge
                          variant={
                            version.status === "active"
                              ? "success"
                              : version.status === "pending_approval"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {statusLabel(version.status)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-micro text-stone-500 truncate">
                        {version.reason} · {version.productCount} produits ·{" "}
                        {version.ruleCount} règles
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {version.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void transition(version, "submit")}
                        >
                          Soumettre
                        </Button>
                      )}
                      {version.status === "pending_approval" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void transition(version, "approve")}
                        >
                          Approuver
                        </Button>
                      )}
                      {version.status === "approved" && (
                        <Button
                          size="sm"
                          onClick={() => void transition(version, "publish")}
                        >
                          Publier
                        </Button>
                      )}
                      {version.status === "archived" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void transition(version, "rollback")}
                        >
                          Préparer le rollback
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {tab !== "discovery" && (
            <aside
              className="bg-bg-subtle p-4 space-y-4"
              aria-label="Simulation et explication"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-black text-stone-950">
                    Pourquoi ce résultat ?
                  </h2>
                </div>
                <p className="mt-1 text-micro leading-relaxed text-stone-500">
                  Simulez un contexte sans publier ni modifier la configuration.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-micro font-bold text-stone-600">
                  Compte
                  <select
                    value={simulation.userType}
                    onChange={(event) =>
                      setSimulation((current) => ({
                        ...current,
                        userType: event.target.value as typeof current.userType,
                      }))
                    }
                    className="mt-1 w-full h-control-touch rounded-control border border-border-base bg-bg-surface px-2 text-xs"
                  >
                    <option value="individual">Particulier</option>
                    <option value="professional">Professionnel</option>
                    <option value="organization">Organisation</option>
                  </select>
                </label>
                <label className="text-micro font-bold text-stone-600">
                  Catégorie
                  <select
                    value={simulation.categoryId}
                    onChange={(event) =>
                      setSimulation((current) => ({
                        ...current,
                        categoryId: event.target.value,
                      }))
                    }
                    className="mt-1 w-full h-control-touch rounded-control border border-border-base bg-bg-surface px-2 text-xs"
                  >
                    <option value={CANONICAL_TAXONOMY_IDS.vehicles}>
                      Auto
                    </option>
                    <option value={CANONICAL_TAXONOMY_IDS.realEstate}>
                      Immobilier
                    </option>
                    <option value={CANONICAL_TAXONOMY_IDS.courses}>
                      Cours
                    </option>
                    <option value={CANONICAL_TAXONOMY_IDS.electronics}>
                      Générique
                    </option>
                  </select>
                </label>
                <label className="col-span-2 text-micro font-bold text-stone-600">
                  Utilisation actuelle
                  <input
                    type="number"
                    min={0}
                    value={simulation.usageLevel}
                    onChange={(event) =>
                      setSimulation((current) => ({
                        ...current,
                        usageLevel: Math.max(0, Number(event.target.value)),
                      }))
                    }
                    className="mt-1 w-full h-control-touch rounded-control border border-border-base bg-bg-surface px-3 text-xs"
                  />
                </label>
              </div>
              <Button
                size="sm"
                fullWidth
                onClick={() => void runSimulation()}
                disabled={simulating}
              >
                {simulating ? (
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                ) : (
                  <ListFilter className="w-4 h-4" />
                )}{" "}
                Simuler
              </Button>
              {evaluation ? (
                <div className="rounded-lg border border-border-base bg-bg-surface p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-micro font-black uppercase tracking-wide text-stone-500">
                      Décision
                    </span>
                    <Badge
                      variant={evaluation.eligible ? "success" : "warning"}
                    >
                      {evaluation.eligible ? "Éligible" : "Action requise"}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-micro text-stone-500">Quota</div>
                      <div className="text-sm font-black text-stone-950">
                        {evaluation.quotaLimit ?? "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-micro text-stone-500">Restant</div>
                      <div className="text-sm font-black text-stone-950">
                        {evaluation.quotaRemaining ?? "—"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-border-subtle pt-3 space-y-2">
                    {matchedRules.slice(0, 4).map((entry, index) => (
                      <div key={entry.ruleId} className="flex gap-2 text-micro">
                        <span className="w-5 h-5 rounded-full bg-primary-light text-primary flex items-center justify-center font-black shrink-0">
                          {index + 1}
                        </span>
                        <div>
                          <div className="font-bold text-stone-800">
                            {entry.ruleName}
                          </div>
                          <div className="text-stone-500">
                            Priorité {entry.priority} · spécificité{" "}
                            {entry.specificity}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedProduct ? (
                <div className="rounded-lg border border-border-base bg-bg-surface p-3">
                  <div className="text-micro font-black uppercase tracking-wide text-stone-500">
                    Sélection
                  </div>
                  <div className="mt-1 text-xs font-black text-stone-950">
                    {selectedProduct.name}
                  </div>
                  <p className="mt-1 text-micro leading-relaxed text-stone-500">
                    {selectedProduct.description}
                  </p>
                  <dl className="mt-3 space-y-2 border-t border-border-subtle pt-3">
                    {selectedProduct.entitlements.slice(0, 5).map((entry) => (
                      <div
                        key={entry.key}
                        className="flex justify-between gap-3 text-micro"
                      >
                        <dt className="text-stone-500">{entry.label}</dt>
                        <dd className="font-bold text-stone-800">
                          {String(entry.value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-3 border-t border-border-subtle pt-3">
                    <div className="text-micro font-black uppercase tracking-wide text-stone-500">
                      Consommateurs affectés
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedProduct.sourceConsumers.map((consumer) => (
                        <span
                          key={consumer}
                          className="rounded bg-bg-subtle px-2 py-1 text-micro font-semibold text-stone-700"
                        >
                          {consumer}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="outline"
                    fullWidth
                    onClick={openEditor}
                  >
                    <GitCompareArrows className="w-4 h-4" /> Modifier dans un
                    brouillon
                  </Button>
                </div>
              ) : null}
              <div className="rounded-lg border border-border-base bg-bg-surface p-3">
                <div className="flex items-center gap-2 text-xs font-black text-stone-900">
                  <History className="w-4 h-4 text-stone-500" /> Traçabilité
                </div>
                <p className="mt-1 text-micro leading-relaxed text-stone-500">
                  Chaque publication conserve le motif, le diff, l’auteur,
                  l’approbateur et le snapshot utilisé par les devis.
                </p>
              </div>
            </aside>
          )}
        </div>
      </section>

      <Modal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        title="Créer un brouillon commercial"
        description="La version publiée reste inchangée jusqu’à l’approbation et la publication."
        maxWidth="lg"
      >
        <form onSubmit={createDraft} className="space-y-4">
          <div className="rounded-lg border border-border-base bg-bg-subtle p-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-micro text-stone-500">
                Produit sélectionné
              </div>
              <div className="text-xs font-black text-stone-950">
                {selectedProduct?.name}
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-stone-400" />
            <div className="text-right">
              <div className="text-micro text-stone-500">Version cible</div>
              <div className="text-xs font-black text-primary">
                v
                {Math.max(
                  ...overview.versions.map((version) => version.versionNumber),
                ) + 1}
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <FormField
              label="Montant HT (centimes)"
              required
              hint="Entier en unité mineure : 299 = 2,99 €."
            >
              <Input
                type="number"
                min={0}
                value={draftAmountMinor}
                onChange={(event) =>
                  setDraftAmountMinor(Math.max(0, Number(event.target.value)))
                }
              />
            </FormField>
            <FormField label="Aperçu">
              <div className="h-control-touch rounded-control border border-border-base bg-bg-subtle px-3 flex items-center text-sm font-black text-stone-900">
                {formatMinor(draftAmountMinor)}
              </div>
            </FormField>
          </div>
          <FormField
            label="Motif du changement"
            required
            hint="Visible dans l’audit et par l’approbateur."
          >
            <Textarea
              rows={3}
              value={draftReason}
              onChange={(event) => setDraftReason(event.target.value)}
              placeholder="Ex. Alignement tarifaire France après validation Finance…"
            />
          </FormField>
          <FormField
            label="Activation planifiée"
            hint="Laissez vide pour publier dès la dernière approbation."
          >
            <Input
              type="datetime-local"
              value={draftEffectiveFrom}
              onChange={(event) => setDraftEffectiveFrom(event.target.value)}
            />
          </FormField>
          <div className="rounded-control border border-warning-border bg-warning-surface p-3 text-xs text-stone-700">
            <strong>Contrôle des quatre yeux.</strong> Le créateur du brouillon
            ne pourra pas l’approuver lui-même.
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditorOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving || draftReason.trim().length < 8}
            >
              {saving ? (
                <LoaderCircle className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}{" "}
              Créer le brouillon
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
