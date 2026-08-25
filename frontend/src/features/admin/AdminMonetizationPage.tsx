import React, { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BusinessVertical,
  CommercialConfigurationVersion,
  MonetizationAdminOverview,
  MonetizationEntitlement,
  MonetizationProduct,
  Promotion,
  CommercialRuleOutcome,
  RuleEvaluationResult,
} from "@shongre/contracts/monetization";
import {
  isCommercialEntitlementOperational,
  isCommercialProductPurchasable,
  MONETIZATION_ADMIN_CONSTRAINTS,
} from "@shongre/contracts/monetization";
import { CANONICAL_TAXONOMY_IDS } from "@shongre/contracts/taxonomy-catalog";
import {
  AlertTriangle,
  BadgeEuro,
  CalendarClock,
  Check,
  ChevronRight,
  CircleGauge,
  Download,
  FileClock,
  Filter,
  Gift,
  GitCompareArrows,
  History,
  Layers3,
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
import { PromptModal } from "../../design-system/primitives/PromptModal";
import { usePageMeta } from "../../hooks/usePageMeta";
import { AdminDiscoveryConfigurationPanel } from "./AdminDiscoveryConfigurationPanel";
import { AdminPlanDraftModal } from "./AdminPlanDraftModal";
import { useTranslation } from "../../i18n/I18nProvider";
import { labelIdentifier } from "../../utilities/identifier-label";
import { useAuthorization } from "../../security/useAuthorization";
import { AdminCommissionPanel } from "./AdminCommissionPanel";
import { formatCurrencySymbol } from "../../utilities/formatters";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useRegionalFormatters } from "../../hooks/useRegionalFormatters";

type TabId =
  | "catalog"
  | "verticals"
  | "rules"
  | "plans"
  | "promotions"
  | "discovery"
  | "fees"
  | "commissions"
  | "operations"
  | "complimentary"
  | "history";

interface CampaignDraftForm {
  name: string;
  code: string;
  verticalId: string;
  discountType: Promotion["discountType"];
  discountValue: number;
  activationMode: Promotion["activationMode"];
  eligibleCustomerType: Promotion["eligibleCustomerType"];
  stackingPolicy: Promotion["stackingPolicy"];
  maximumRedemptions: number;
  maximumRedemptionsPerAccount: number;
  freePeriodDays: number;
  durationBillingPeriods: number;
  minimumCommitmentPeriods: number;
  providerCouponId: string;
  startsAt: string;
  endsAt: string;
  reason: string;
}

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "catalog", label: "Catalogue" },
  { id: "verticals", label: "Verticales" },
  { id: "rules", label: "Règles" },
  { id: "plans", label: "Offres Pro" },
  { id: "promotions", label: "Promotions" },
  { id: "discovery", label: "" },
  { id: "fees", label: "Taxes & frais" },
  { id: "commissions", label: "Commissions" },
  { id: "operations", label: "Opérations" },
  { id: "complimentary", label: "Accès offert" },
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

function entitlementReadiness(entitlement: MonetizationEntitlement): {
  label: string;
  variant: "success" | "warning" | "neutral";
} {
  if (isCommercialEntitlementOperational(entitlement)) {
    return entitlement.availability === "beta"
      ? { label: "Bêta", variant: "warning" }
      : { label: "Opérationnel", variant: "success" };
  }
  if (entitlement.implementationStatus === "external_dependency") {
    return { label: "Dépendance externe", variant: "warning" };
  }
  if (entitlement.implementationStatus === "incomplete") {
    return { label: "Incomplet", variant: "warning" };
  }
  return {
    label:
      entitlement.availability === "disabled" ? "Désactivé" : "Maintenance",
    variant: entitlement.availability === "disabled" ? "neutral" : "warning",
  };
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
  formatMinor: (amountMinor: number, currency?: string) => string,
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string,
): string {
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "number") {
    if (key.endsWith("Minor")) return formatMinor(value);
    if (key.endsWith("Bps")) {
      return `${formatNumber(value / 100, { maximumFractionDigits: 2 })} %`;
    }
    if (key.endsWith("Days")) return `${value} jours`;
    return formatNumber(value);
  }
  if (Array.isArray(value)) return value.map(String).join(", ");
  return labelIdentifier(String(value));
}

export const AdminMonetizationPage: React.FC = () => {
  const { t } = useTranslation();
  const { activeMarket, currentCurrency, currentLocale } = useMarketLocation();
  const {
    formatDate,
    formatDateTime,
    formatMoneyMinor: formatMinor,
    formatNumber,
  } = useRegionalFormatters();
  const { can } = useAuthorization();
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
  const [verticalFilter, setVerticalFilter] = useState("all");
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
  const [planDraftProduct, setPlanDraftProduct] =
    useState<MonetizationProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [verticalEditor, setVerticalEditor] = useState<
    | (Omit<BusinessVertical, "categoryIds" | "capabilityKeys"> & {
        categoryIds: string;
        capabilityKeys: string;
        existing: boolean;
      })
    | null
  >(null);
  const [verticalReason, setVerticalReason] = useState("");
  const [campaign, setCampaign] = useState<CampaignDraftForm>({
    name: "",
    code: "",
    verticalId: "",
    discountType: "percentage" as Promotion["discountType"],
    discountValue: MONETIZATION_ADMIN_CONSTRAINTS.percentageMajor.min,
    activationMode: "coupon" as Promotion["activationMode"],
    eligibleCustomerType: "new" as Promotion["eligibleCustomerType"],
    stackingPolicy: "exclusive" as Promotion["stackingPolicy"],
    maximumRedemptions: MONETIZATION_ADMIN_CONSTRAINTS.nonNegativeInteger.min,
    maximumRedemptionsPerAccount:
      MONETIZATION_ADMIN_CONSTRAINTS.positiveInteger.min,
    freePeriodDays: MONETIZATION_ADMIN_CONSTRAINTS.nonNegativeInteger.min,
    durationBillingPeriods: MONETIZATION_ADMIN_CONSTRAINTS.positiveInteger.min,
    minimumCommitmentPeriods:
      MONETIZATION_ADMIN_CONSTRAINTS.nonNegativeInteger.min,
    providerCouponId: "",
    startsAt: "",
    endsAt: "",
    reason: "",
  });
  const [complimentaryGrant, setComplimentaryGrant] = useState({
    accountId: "",
    productVersionId: "",
    campaignId: "",
    startsAt: "",
    endsAt: "",
    reason: "",
  });
  const [complimentaryDecision, setComplimentaryDecision] = useState({
    requestId: "",
    decision: "approved" as "approved" | "rejected",
    reason: "",
  });
  const [pendingTransition, setPendingTransition] = useState<{
    version: CommercialConfigurationVersion;
    action: "submit" | "approve" | "publish" | "rollback";
  } | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await services.businessRules.getAdminOverview(
        activeMarket.code,
      );
      setOverview(result);
      setSelectedProductId(
        (current) => current || result.catalog.products[0]?.id || null,
      );
      setCampaign((current) => ({
        ...current,
        verticalId: current.verticalId || result.catalog.verticals[0]?.id || "",
      }));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Chargement impossible.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeMarket.code]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const products = useMemo(() => {
    if (!overview) return [];
    return overview.catalog.products.filter((product) => {
      const tabMatches =
        tab === "catalog" ||
        (tab === "plans" &&
          product.kind === "subscription" &&
          product.commercialProfile.professionalOnly &&
          Boolean(product.commercialProfile.tier));
      const verticalMatches =
        verticalFilter === "all" ||
        (verticalFilter === "general"
          ? !product.commercialProfile.verticalId
          : product.commercialProfile.verticalId === verticalFilter);
      const audienceMatches =
        audience === "all" ||
        product.audience === audience ||
        product.audience === "all";
      const queryMatches =
        `${product.name} ${product.code} ${product.description}`
          .toLowerCase()
          .includes(query.toLowerCase());
      return tabMatches && verticalMatches && audienceMatches && queryMatches;
    });
  }, [audience, overview, query, tab, verticalFilter]);

  const selectedProduct =
    overview?.catalog.products.find(
      (product) => product.id === selectedProductId,
    ) || null;

  const runSimulation = async () => {
    setSimulating(true);
    setError(null);
    try {
      setEvaluation(
        await services.businessRules.evaluate({
          marketCode: activeMarket.code,
          currency: activeMarket.currency,
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
    if (selectedProduct) {
      setPlanDraftProduct(structuredClone(selectedProduct));
    }
  };

  const createPlanDraft = async (input: {
    product: MonetizationProduct;
    reason: string;
    effectiveFrom?: string;
  }) => {
    if (!overview) return;
    setSaving(true);
    try {
      const updatedProducts = overview.catalog.products.map((product) =>
        product.id === input.product.id ? input.product : product,
      );
      const version = await services.businessRules.createDraft({
        reason: input.reason,
        effectiveFrom: input.effectiveFrom,
        products: updatedProducts,
      });
      setNotice(
        `Brouillon v${version.versionNumber} créé. L’offre publiée reste inchangée.`,
      );
      setPlanDraftProduct(null);
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

  const createCampaignDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    const currentOverview = overview;
    if (
      !currentOverview ||
      campaign.reason.trim().length <
        MONETIZATION_ADMIN_CONSTRAINTS.changeReason.minLength ||
      !campaign.name.trim() ||
      campaign.code.trim().length <
        MONETIZATION_ADMIN_CONSTRAINTS.promotionCode.minLength ||
      !campaign.startsAt ||
      !campaign.endsAt
    )
      return;
    const targetProducts = currentOverview.catalog.products
      .filter(
        (product) =>
          product.status === "active" &&
          product.kind === "subscription" &&
          Boolean(product.commercialProfile.tier) &&
          product.commercialProfile.verticalId === campaign.verticalId,
      )
      .map((product) => product.id);
    if (targetProducts.length === 0) {
      setError("Aucun forfait actif pour cette verticale.");
      return;
    }
    setSaving(true);
    try {
      const code = campaign.code.trim().toUpperCase();
      const discountValue =
        campaign.discountType === "percentage"
          ? Math.round(
              campaign.discountValue *
                MONETIZATION_ADMIN_CONSTRAINTS.percentageToBps,
            )
          : campaign.discountType === "free_period"
            ? 0
            : Math.round(
                campaign.discountValue *
                  MONETIZATION_ADMIN_CONSTRAINTS.moneyMajorToMinor,
              );
      const version = await services.businessRules.createDraft({
        reason: campaign.reason.trim(),
        promotions: [
          ...currentOverview.catalog.promotions,
          {
            id: `promotion-${code.toLowerCase()}-${Date.now()}`,
            code,
            name: campaign.name.trim(),
            status: "draft",
            scope: {
              marketCodes: [activeMarket.code],
              currencies: [activeMarket.currency],
              categoryIds:
                currentOverview.catalog.verticals.find(
                  (vertical) => vertical.id === campaign.verticalId,
                )?.categoryIds || [],
              subcategoryIds: [],
              typeIds: [],
              subtypeIds: [],
              audiences: ["professional", "organization"],
              planIds: [],
              customerSegments: [],
              publicationChannels: ["web", "mobile"],
              verticalIds: [campaign.verticalId],
            },
            productIds: targetProducts,
            discountType: campaign.discountType,
            discountValue,
            stackingPolicy: campaign.stackingPolicy,
            maximumRedemptions: campaign.maximumRedemptions || undefined,
            maximumRedemptionsPerAccount: campaign.maximumRedemptionsPerAccount,
            activationMode: campaign.activationMode,
            eligibleCustomerType: campaign.eligibleCustomerType,
            freePeriodDays: campaign.freePeriodDays || undefined,
            durationBillingPeriods: campaign.durationBillingPeriods,
            minimumCommitmentPeriods: campaign.minimumCommitmentPeriods,
            campaignId: `campaign-${code.toLowerCase()}`,
            providerCouponId: campaign.providerCouponId.trim() || undefined,
            verticalIds: [campaign.verticalId],
            startsAt: new Date(campaign.startsAt).toISOString(),
            endsAt: new Date(campaign.endsAt).toISOString(),
          },
        ],
      });
      setNotice(`Campagne ajoutée au brouillon v${version.versionNumber}.`);
      setCampaignOpen(false);
      await loadOverview();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Création de la campagne impossible.",
      );
    } finally {
      setSaving(false);
    }
  };

  const openVerticalEditor = (vertical?: BusinessVertical) => {
    setVerticalReason("");
    setVerticalEditor(
      vertical
        ? {
            ...vertical,
            categoryIds: vertical.categoryIds.join(", "),
            capabilityKeys: vertical.capabilityKeys.join(", "),
            existing: true,
          }
        : {
            id: "",
            name: "",
            description: "",
            categoryIds: "",
            capabilityKeys: "",
            status: "disabled",
            sortOrder:
              (overview?.catalog.verticals.length || 0) *
              MONETIZATION_ADMIN_CONSTRAINTS.sortOrderIncrement,
            existing: false,
          },
    );
  };

  const saveVerticalDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      !overview ||
      !verticalEditor ||
      verticalReason.trim().length <
        MONETIZATION_ADMIN_CONSTRAINTS.changeReason.minLength ||
      !verticalEditor.id.trim() ||
      !verticalEditor.name.trim()
    )
      return;
    const list = (value: string) => [
      ...new Set(
        value
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean),
      ),
    ];
    const updated: BusinessVertical = {
      id: verticalEditor.id.trim().toLowerCase(),
      name: verticalEditor.name.trim(),
      description: verticalEditor.description.trim(),
      categoryIds: list(verticalEditor.categoryIds),
      capabilityKeys: list(verticalEditor.capabilityKeys),
      status: verticalEditor.status,
      sortOrder: verticalEditor.sortOrder,
    };
    const duplicate = overview.catalog.verticals.some(
      (entry) => entry.id === updated.id && !verticalEditor.existing,
    );
    if (duplicate) {
      setError("Cet identifiant de verticale existe déjà.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const verticals = verticalEditor.existing
        ? overview.catalog.verticals.map((entry) =>
            entry.id === updated.id ? updated : entry,
          )
        : [...overview.catalog.verticals, updated];
      const version = await services.businessRules.createDraft({
        reason: verticalReason.trim(),
        verticals,
      });
      setNotice(
        `Verticale enregistrée dans le brouillon v${version.versionNumber}.`,
      );
      setVerticalEditor(null);
      await loadOverview();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Enregistrement de la verticale impossible.",
      );
    } finally {
      setSaving(false);
    }
  };

  const requestComplimentaryGrant = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const request = await services.businessRules.requestComplimentaryGrant({
        ...complimentaryGrant,
        campaignId: complimentaryGrant.campaignId.trim() || undefined,
        startsAt: new Date(complimentaryGrant.startsAt).toISOString(),
        endsAt: new Date(complimentaryGrant.endsAt).toISOString(),
        reason: complimentaryGrant.reason.trim(),
        idempotencyKey: `admin-complimentary-request-${Date.now()}`,
      });
      setComplimentaryDecision((current) => ({
        ...current,
        requestId: request.id,
      }));
      setNotice(
        `Demande ${request.id} enregistrée. Une seconde personne autorisée doit la décider.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Demande impossible.",
      );
    } finally {
      setSaving(false);
    }
  };

  const decideComplimentaryGrant = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await services.businessRules.decideComplimentaryGrant(
        complimentaryDecision.requestId.trim(),
        {
          decision: complimentaryDecision.decision,
          reason: complimentaryDecision.reason.trim(),
          idempotencyKey: `admin-complimentary-decision-${Date.now()}`,
        },
      );
      setNotice(
        result.decision === "approved"
          ? `Accès offert approuvé · ${result.grantId}`
          : `Demande ${result.requestId} rejetée.`,
      );
      await loadOverview();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Décision impossible.",
      );
    } finally {
      setSaving(false);
    }
  };

  const transition = (
    version: CommercialConfigurationVersion,
    action: "submit" | "approve" | "publish" | "rollback",
  ) => {
    setPendingTransition({ version, action });
  };

  const confirmTransition = async (reason: string) => {
    if (!pendingTransition) return;
    const { version, action } = pendingTransition;
    try {
      await services.businessRules.transitionVersion(
        version.id,
        action,
        reason,
      );
      setPendingTransition(null);
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
              <span className="text-stone-500">
                {activeMarket.name} · {activeMarket.currency}
              </span>
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
          "verticals",
          "rules",
          "promotions",
          "discovery",
          "fees",
          "commissions",
          "operations",
          "complimentary",
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
            {tab === "plans" && (
              <label className="flex items-center gap-2 rounded-control border border-border-base px-3 h-control-touch text-xs font-semibold text-stone-700">
                <Layers3 className="w-4 h-4" />
                <span className="sr-only">Verticale</span>
                <select
                  value={verticalFilter}
                  onChange={(event) => setVerticalFilter(event.target.value)}
                  className="bg-transparent focus:outline-none h-control-touch"
                >
                  <option value="all">Toutes les verticales</option>
                  {overview.catalog.verticals
                    .filter((vertical) => vertical.status !== "archived")
                    .map((vertical) => (
                      <option key={vertical.id} value={vertical.id}>
                        {vertical.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
          </div>
        )}

        <div
          className={`grid min-h-96 ${tab === "discovery" ? "grid-cols-1" : "xl:grid-cols-admin-content-aside"}`}
        >
          <div
            className={`min-w-0 ${tab === "discovery" ? "" : "xl:border-r border-border-subtle"}`}
          >
            {(tab === "catalog" || tab === "plans") && (
              <div className="divide-y divide-border-subtle">
                <div className="hidden md:grid grid-cols-admin-monetization gap-3 px-4 py-2 bg-bg-subtle text-micro font-black uppercase tracking-wide text-stone-500">
                  <span>Produit</span>
                  <span>
                    {tab === "plans" ? "Verticale · niveau" : "Audience"}
                  </span>
                  <span>Prix actif</span>
                  <span>État</span>
                  <span />
                </div>
                {products.map((product) => {
                  const price = product.prices[0];
                  const selected = product.id === selectedProductId;
                  const purchasable = isCommercialProductPurchasable(product);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => setSelectedProductId(product.id)}
                      className={`w-full text-left p-4 md:grid md:grid-cols-admin-monetization md:items-center gap-3 hover:bg-bg-subtle focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary ${selected ? "bg-primary-light" : "bg-bg-surface"}`}
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
                        {tab === "plans"
                          ? `${
                              overview.catalog.verticals.find(
                                (vertical) =>
                                  vertical.id ===
                                  (product.commercialProfile.verticalId ||
                                    "general"),
                              )?.name || "Général"
                            } · ${product.commercialProfile.tier || "—"}`
                          : product.audience === "all"
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
                            product.status === "active" && purchasable
                              ? "success"
                              : product.status === "active"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {product.status === "active" && purchasable
                            ? "Actif"
                            : product.status === "active"
                              ? "Suspendu"
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

            {tab === "verticals" && (
              <div className="p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-black text-stone-950">
                      Verticales commerciales
                    </h2>
                    <p className="mt-1 text-micro text-stone-500">
                      Identifiants stables, catégories et capacités publiés via
                      le workflow versionné.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => openVerticalEditor()}>
                    <Plus className="h-4 w-4" /> Nouvelle verticale
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[...overview.catalog.verticals]
                    .sort((left, right) => left.sortOrder - right.sortOrder)
                    .map((vertical) => {
                      const planCount = overview.catalog.products.filter(
                        (product) =>
                          product.kind === "subscription" &&
                          product.status === "active" &&
                          (product.commercialProfile.verticalId ||
                            "general") === vertical.id,
                      ).length;
                      return (
                        <article
                          key={vertical.id}
                          className="rounded-lg border border-border-base p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-black text-stone-950">
                                  {vertical.name}
                                </h3>
                                <Badge
                                  variant={
                                    vertical.status === "active"
                                      ? "success"
                                      : "neutral"
                                  }
                                >
                                  {labelIdentifier(vertical.status)}
                                </Badge>
                              </div>
                              <p className="mt-1 text-micro text-stone-500">
                                {vertical.id} · ordre {vertical.sortOrder} ·{" "}
                                {planCount} forfait(s)
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openVerticalEditor(vertical)}
                            >
                              Modifier
                            </Button>
                          </div>
                          <p className="mt-3 text-xs text-stone-600">
                            {vertical.description}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {vertical.categoryIds.map((categoryId) => (
                              <span
                                key={categoryId}
                                className="rounded bg-bg-subtle px-2 py-1 text-micro font-semibold text-stone-700"
                              >
                                {categoryId}
                              </span>
                            ))}
                            {vertical.categoryIds.length === 0 && (
                              <span className="text-micro text-stone-400">
                                Aucune catégorie spécialisée
                              </span>
                            )}
                          </div>
                        </article>
                      );
                    })}
                </div>
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
                            {formatRuleOutcomeValue(
                              key,
                              value,
                              formatMinor,
                              formatNumber,
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {tab === "promotions" && (
              <div className="p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-black text-stone-950">
                      Campagnes et coupons
                    </h2>
                    <p className="mt-1 text-micro text-stone-500">
                      Les changements sont ajoutés à un brouillon soumis au
                      workflow d’approbation.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setCampaignOpen(true)}>
                    <Plus className="h-4 w-4" /> Nouvelle campagne
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
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
                          : promotion.discountType === "free_period"
                            ? "Période offerte"
                            : formatMinor(promotion.discountValue)}{" "}
                        · {labelIdentifier(promotion.stackingPolicy)} ·{" "}
                        {labelIdentifier(promotion.activationMode)}
                      </p>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-micro">
                        <div>
                          <dt className="text-stone-500">Cible</dt>
                          <dd className="font-bold text-stone-800">
                            {labelIdentifier(promotion.eligibleCustomerType)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-stone-500">Durée</dt>
                          <dd className="font-bold text-stone-800">
                            {promotion.durationBillingPeriods
                              ? `${promotion.durationBillingPeriods} période(s)`
                              : "Ponctuelle"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-stone-500">Verticales</dt>
                          <dd className="font-bold text-stone-800">
                            {promotion.verticalIds
                              .map(
                                (id) =>
                                  overview.catalog.verticals.find(
                                    (vertical) => vertical.id === id,
                                  )?.name || id,
                              )
                              .join(", ") || "Toutes"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-stone-500">Fin</dt>
                          <dd className="font-bold text-stone-800">
                            {formatDate(promotion.endsAt)}
                          </dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {tab === "discovery" && <AdminDiscoveryConfigurationPanel />}

            {tab === "commissions" && (
              <AdminCommissionPanel catalog={overview.catalog} />
            )}

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
                              {formatRuleOutcomeValue(
                                key,
                                value,
                                formatMinor,
                                formatNumber,
                              )}
                            </div>
                          ))}
                      </div>
                    </article>
                  ))}
              </div>
            )}

            {tab === "complimentary" && (
              <div className="p-4 grid gap-4 lg:grid-cols-2">
                <form
                  className="rounded-lg border border-border-base p-4 space-y-3"
                  onSubmit={(event) => void requestComplimentaryGrant(event)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-control bg-primary-light text-primary flex items-center justify-center shrink-0">
                      <Gift className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-stone-950">
                        Demander un accès offert
                      </h2>
                      <p className="mt-1 text-micro text-stone-500">
                        La demande ne crée aucun faux paiement et attend une
                        approbation distincte.
                      </p>
                    </div>
                  </div>
                  <label className="block text-micro font-bold text-stone-600">
                    Compte bénéficiaire
                    <Input
                      required
                      value={complimentaryGrant.accountId}
                      onChange={(event) =>
                        setComplimentaryGrant((current) => ({
                          ...current,
                          accountId: event.target.value,
                        }))
                      }
                      placeholder="Identifiant utilisateur ou organisation"
                    />
                  </label>
                  <label className="block text-micro font-bold text-stone-600">
                    Forfait
                    <select
                      required
                      value={complimentaryGrant.productVersionId}
                      onChange={(event) =>
                        setComplimentaryGrant((current) => ({
                          ...current,
                          productVersionId: event.target.value,
                        }))
                      }
                      className="mt-1 w-full h-control-touch rounded-control border border-border-base bg-bg-surface px-3 text-xs"
                    >
                      <option value="">Sélectionner un forfait</option>
                      {overview.catalog.products
                        .filter(
                          (product) =>
                            product.kind === "subscription" &&
                            Boolean(product.commercialProfile.tier),
                        )
                        .map((product) => (
                          <option
                            key={product.versionId}
                            value={product.versionId}
                          >
                            {product.name} · {statusLabel(product.status)}
                          </option>
                        ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-micro font-bold text-stone-600">
                      Début
                      <Input
                        required
                        type="datetime-local"
                        value={complimentaryGrant.startsAt}
                        onChange={(event) =>
                          setComplimentaryGrant((current) => ({
                            ...current,
                            startsAt: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="text-micro font-bold text-stone-600">
                      Fin
                      <Input
                        required
                        type="datetime-local"
                        value={complimentaryGrant.endsAt}
                        onChange={(event) =>
                          setComplimentaryGrant((current) => ({
                            ...current,
                            endsAt: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                  <label className="block text-micro font-bold text-stone-600">
                    Campagne ou référence
                    <Input
                      value={complimentaryGrant.campaignId}
                      onChange={(event) =>
                        setComplimentaryGrant((current) => ({
                          ...current,
                          campaignId: event.target.value,
                        }))
                      }
                      placeholder="Ex. partenaire-lancement-2026"
                    />
                  </label>
                  <label className="block text-micro font-bold text-stone-600">
                    Motif auditable
                    <Textarea
                      required
                      minLength={
                        MONETIZATION_ADMIN_CONSTRAINTS
                          .complimentaryRequestReason.minLength
                      }
                      value={complimentaryGrant.reason}
                      onChange={(event) =>
                        setComplimentaryGrant((current) => ({
                          ...current,
                          reason: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <Button
                    size="sm"
                    type="submit"
                    disabled={
                      saving ||
                      !can("monetization.complimentary_grants.request")
                    }
                  >
                    Soumettre à approbation
                  </Button>
                </form>

                <form
                  className="rounded-lg border border-border-base p-4 space-y-3"
                  onSubmit={(event) => void decideComplimentaryGrant(event)}
                >
                  <div>
                    <h2 className="text-sm font-black text-stone-950">
                      Décision finale
                    </h2>
                    <p className="mt-1 text-micro text-stone-500">
                      Réservée au rôle propriétaire. Le demandeur ne peut pas
                      approuver sa propre demande.
                    </p>
                  </div>
                  <label className="block text-micro font-bold text-stone-600">
                    Identifiant de demande
                    <Input
                      required
                      value={complimentaryDecision.requestId}
                      onChange={(event) =>
                        setComplimentaryDecision((current) => ({
                          ...current,
                          requestId: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="block text-micro font-bold text-stone-600">
                    Décision
                    <select
                      value={complimentaryDecision.decision}
                      onChange={(event) =>
                        setComplimentaryDecision((current) => ({
                          ...current,
                          decision: event.target.value as
                            "approved" | "rejected",
                        }))
                      }
                      className="mt-1 w-full h-control-touch rounded-control border border-border-base bg-bg-surface px-3 text-xs"
                    >
                      <option value="approved">Approuver</option>
                      <option value="rejected">Rejeter</option>
                    </select>
                  </label>
                  <label className="block text-micro font-bold text-stone-600">
                    Motif de décision
                    <Textarea
                      required
                      minLength={
                        MONETIZATION_ADMIN_CONSTRAINTS
                          .complimentaryDecisionReason.minLength
                      }
                      value={complimentaryDecision.reason}
                      onChange={(event) =>
                        setComplimentaryDecision((current) => ({
                          ...current,
                          reason: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <Button
                    size="sm"
                    type="submit"
                    disabled={
                      saving || !can("monetization.complimentary_grants.create")
                    }
                  >
                    Enregistrer la décision
                  </Button>
                </form>
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
                    Abonnements par compte
                  </h2>
                  <div className="mt-2 overflow-x-auto rounded-lg border border-border-base">
                    <table className="w-full min-w-190 text-xs">
                      <thead className="bg-bg-subtle text-left text-stone-600">
                        <tr>
                          <th className="px-3 py-2 font-bold" scope="col">
                            Compte
                          </th>
                          <th className="px-3 py-2 font-bold" scope="col">
                            Forfait
                          </th>
                          <th className="px-3 py-2 font-bold" scope="col">
                            Verticale · niveau
                          </th>
                          <th className="px-3 py-2 font-bold" scope="col">
                            Statut
                          </th>
                          <th className="px-3 py-2 font-bold" scope="col">
                            Renouvellement / changement
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {overview.subscriptions.map((subscription) => {
                          const product = overview.catalog.products.find(
                            (candidate) =>
                              candidate.id === subscription.productId,
                          );
                          return (
                            <tr key={subscription.id}>
                              <td className="px-3 py-2 font-mono text-stone-700">
                                {subscription.accountId}
                              </td>
                              <td className="px-3 py-2">
                                <div className="font-bold text-stone-900">
                                  {product?.name || subscription.productId}
                                </div>
                                <div className="text-micro text-stone-500">
                                  {subscription.productVersionId ||
                                    "Version héritée"}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-stone-700">
                                {labelIdentifier(
                                  subscription.verticalId || "general",
                                )}{" "}
                                ·{" "}
                                {labelIdentifier(
                                  product?.commercialProfile.tier || "legacy",
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <Badge>
                                  {labelIdentifier(subscription.status)}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 text-stone-700">
                                {formatDate(
                                  subscription.scheduledChangeAt ||
                                    subscription.currentPeriodEnd,
                                )}
                                {subscription.scheduledProductId
                                  ? ` · ${
                                      overview.catalog.products.find(
                                        (candidate) =>
                                          candidate.id ===
                                          subscription.scheduledProductId,
                                      )?.name || subscription.scheduledProductId
                                    }`
                                  : ""}
                              </td>
                            </tr>
                          );
                        })}
                        {overview.subscriptions.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-3 py-5 text-center text-stone-500"
                            >
                              Aucun abonnement à afficher.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h2 className="text-xs font-black text-stone-950">
                    Registre financier
                  </h2>
                  <div className="mt-2 overflow-x-auto rounded-lg border border-border-base">
                    <table className="w-full min-w-155 text-xs">
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
                          {event.actorName} · {formatDateTime(event.createdAt)}{" "}
                          · {event.reason}
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
                      {t("verticals.education.adminCategory")}
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
                    min={MONETIZATION_ADMIN_CONSTRAINTS.nonNegativeInteger.min}
                    value={simulation.usageLevel}
                    onChange={(event) =>
                      setSimulation((current) => ({
                        ...current,
                        usageLevel: Math.max(
                          MONETIZATION_ADMIN_CONSTRAINTS.nonNegativeInteger.min,
                          Number(event.target.value),
                        ),
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
                  {selectedProduct.kind === "subscription" && (
                    <dl className="mt-3 grid grid-cols-2 gap-2 rounded-control bg-bg-subtle p-2 text-micro">
                      <div>
                        <dt className="text-stone-500">Famille</dt>
                        <dd className="font-bold text-stone-900">
                          {selectedProduct.commercialProfile.familyId}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-stone-500">Niveau</dt>
                        <dd className="font-bold capitalize text-stone-900">
                          {selectedProduct.commercialProfile.tier || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-stone-500">Essai</dt>
                        <dd className="font-bold text-stone-900">
                          {selectedProduct.commercialProfile.trialPolicy.enabled
                            ? `${selectedProduct.commercialProfile.trialPolicy.durationDays} jours · paiement ${selectedProduct.commercialProfile.trialPolicy.requiresPaymentMethod ? "requis" : "facultatif"}`
                            : "Désactivé"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-stone-500">Finance</dt>
                        <dd className="font-bold text-stone-900">
                          {labelIdentifier(
                            selectedProduct.commercialProfile.financeCategory,
                          )}
                        </dd>
                      </div>
                    </dl>
                  )}
                  <dl className="mt-3 space-y-2 border-t border-border-subtle pt-3">
                    {selectedProduct.entitlements.slice(0, 8).map((entry) => {
                      const readiness = entitlementReadiness(entry);
                      return (
                        <div
                          key={entry.key}
                          className="flex items-start justify-between gap-3 text-micro"
                        >
                          <dt className="text-stone-500">{entry.label}</dt>
                          <dd className="flex flex-wrap items-center justify-end gap-1 font-bold text-stone-800">
                            <span>{String(entry.value)}</span>
                            <Badge variant={readiness.variant}>
                              {readiness.label}
                            </Badge>
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                  {selectedProduct.kind === "subscription" && (
                    <div className="mt-3 border-t border-border-subtle pt-3 text-micro">
                      <div className="font-black uppercase tracking-wide text-stone-500">
                        Transitions configurées
                      </div>
                      <p className="mt-1 text-stone-700">
                        Montée :{" "}
                        {selectedProduct.commercialProfile.upgradeProductIds.join(
                          ", ",
                        ) || "aucune"}
                      </p>
                      <p className="mt-1 text-stone-700">
                        Baisse :{" "}
                        {selectedProduct.commercialProfile.downgradeProductIds.join(
                          ", ",
                        ) || "aucune"}
                      </p>
                    </div>
                  )}
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

      {planDraftProduct ? (
        <AdminPlanDraftModal
          key={planDraftProduct.id}
          product={planDraftProduct}
          targetVersion={
            Math.max(
              ...overview.versions.map((version) => version.versionNumber),
            ) + 1
          }
          saving={saving}
          onClose={() => setPlanDraftProduct(null)}
          onCreate={createPlanDraft}
        />
      ) : null}
      <Modal
        isOpen={Boolean(verticalEditor)}
        onClose={() => setVerticalEditor(null)}
        title={
          verticalEditor?.existing
            ? "Modifier la verticale"
            : "Créer une verticale"
        }
        description="Le changement crée un brouillon versionné et ne modifie jamais directement le catalogue publié."
        maxWidth="lg"
      >
        {verticalEditor && (
          <form onSubmit={saveVerticalDraft} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label="Identifiant stable"
                required
                hint="Lettres minuscules, chiffres, tiret ou underscore."
              >
                <Input
                  value={verticalEditor.id}
                  disabled={verticalEditor.existing}
                  pattern="[a-z][a-z0-9_-]{1,29}"
                  onChange={(event) =>
                    setVerticalEditor((current) =>
                      current
                        ? { ...current, id: event.target.value }
                        : current,
                    )
                  }
                  placeholder="mobilite"
                />
              </FormField>
              <FormField label="Nom public" required>
                <Input
                  value={verticalEditor.name}
                  onChange={(event) =>
                    setVerticalEditor((current) =>
                      current
                        ? { ...current, name: event.target.value }
                        : current,
                    )
                  }
                  placeholder="Mobilité"
                />
              </FormField>
            </div>
            <FormField label="Description">
              <Textarea
                rows={2}
                value={verticalEditor.description}
                onChange={(event) =>
                  setVerticalEditor((current) =>
                    current
                      ? { ...current, description: event.target.value }
                      : current,
                  )
                }
              />
            </FormField>
            <FormField
              label="Catégories associées"
              hint="Identifiants séparés par des virgules."
            >
              <Input
                value={verticalEditor.categoryIds}
                onChange={(event) =>
                  setVerticalEditor((current) =>
                    current
                      ? { ...current, categoryIds: event.target.value }
                      : current,
                  )
                }
                placeholder="vehicles, mobility"
              />
            </FormField>
            <FormField
              label="Capacités"
              hint="Clés d’autorisation séparées par des virgules."
            >
              <Input
                value={verticalEditor.capabilityKeys}
                onChange={(event) =>
                  setVerticalEditor((current) =>
                    current
                      ? { ...current, capabilityKeys: event.target.value }
                      : current,
                  )
                }
                placeholder="mobility.inventory.manage.own"
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="État" required>
                <select
                  value={verticalEditor.status}
                  onChange={(event) =>
                    setVerticalEditor((current) =>
                      current
                        ? {
                            ...current,
                            status: event.target
                              .value as BusinessVertical["status"],
                          }
                        : current,
                    )
                  }
                  className="w-full h-control-touch rounded-control border border-border-base bg-bg-surface px-3 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="disabled">Désactivée</option>
                  <option value="archived">Archivée</option>
                </select>
              </FormField>
              <FormField label="Ordre d’affichage" required>
                <Input
                  type="number"
                  min={MONETIZATION_ADMIN_CONSTRAINTS.nonNegativeInteger.min}
                  value={verticalEditor.sortOrder}
                  onChange={(event) =>
                    setVerticalEditor((current) =>
                      current
                        ? {
                            ...current,
                            sortOrder: Math.max(
                              MONETIZATION_ADMIN_CONSTRAINTS.nonNegativeInteger
                                .min,
                              Number(event.target.value),
                            ),
                          }
                        : current,
                    )
                  }
                />
              </FormField>
            </div>
            <FormField label="Motif du changement" required>
              <Textarea
                rows={3}
                value={verticalReason}
                onChange={(event) => setVerticalReason(event.target.value)}
                placeholder="Ex. Ouverture contrôlée de la verticale après validation commerciale…"
              />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVerticalEditor(null)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  saving ||
                  verticalReason.trim().length <
                    MONETIZATION_ADMIN_CONSTRAINTS.changeReason.minLength
                }
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}{" "}
                Créer le brouillon
              </Button>
            </div>
          </form>
        )}
      </Modal>
      <Modal
        isOpen={campaignOpen}
        onClose={() => setCampaignOpen(false)}
        title="Créer une campagne promotionnelle"
        description="La campagne est enregistrée dans un brouillon versionné ; elle n’est jamais activée directement."
        maxWidth="lg"
      >
        <form onSubmit={createCampaignDraft} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Nom de campagne" required>
              <Input
                value={campaign.name}
                onChange={(event) =>
                  setCampaign((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Lancement Auto"
              />
            </FormField>
            <FormField label="Code campagne / coupon" required>
              <Input
                value={campaign.code}
                onChange={(event) =>
                  setCampaign((current) => ({
                    ...current,
                    code: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="AUTO2026"
              />
            </FormField>
            <FormField label="Verticale" required>
              <select
                value={campaign.verticalId}
                onChange={(event) =>
                  setCampaign((current) => ({
                    ...current,
                    verticalId: event.target.value,
                  }))
                }
                className="h-control-touch w-full rounded-control border border-border-base bg-bg-surface px-3 text-sm"
              >
                {overview?.catalog.verticals
                  .filter((vertical) => vertical.status === "active")
                  .map((vertical) => (
                    <option key={vertical.id} value={vertical.id}>
                      {vertical.name}
                    </option>
                  ))}
              </select>
            </FormField>
            <FormField label="Type de remise" required>
              <select
                value={campaign.discountType}
                onChange={(event) =>
                  setCampaign((current) => ({
                    ...current,
                    discountType: event.target
                      .value as Promotion["discountType"],
                  }))
                }
                className="h-control-touch w-full rounded-control border border-border-base bg-bg-surface px-3 text-sm"
              >
                <option value="percentage">Pourcentage</option>
                <option value="fixed">Montant fixe</option>
                <option value="introductory_price">Prix d’introduction</option>
                <option value="free_period">Période gratuite</option>
              </select>
            </FormField>
            {campaign.discountType !== "free_period" ? (
              <FormField
                label={
                  campaign.discountType === "percentage"
                    ? "Remise (%)"
                    : campaign.discountType === "fixed"
                      ? `Montant de remise (${formatCurrencySymbol(
                          overview?.catalog.currency || currentCurrency,
                          currentLocale,
                        )})`
                      : `Prix d’introduction (${formatCurrencySymbol(
                          overview?.catalog.currency || currentCurrency,
                          currentLocale,
                        )})`
                }
                required
              >
                <Input
                  type="number"
                  min={
                    campaign.discountType === "percentage"
                      ? MONETIZATION_ADMIN_CONSTRAINTS.percentageMajor.min
                      : MONETIZATION_ADMIN_CONSTRAINTS.moneyMajor.min
                  }
                  max={
                    campaign.discountType === "percentage"
                      ? MONETIZATION_ADMIN_CONSTRAINTS.percentageMajor.max
                      : undefined
                  }
                  step={
                    campaign.discountType === "percentage"
                      ? MONETIZATION_ADMIN_CONSTRAINTS.percentageMajor.step
                      : MONETIZATION_ADMIN_CONSTRAINTS.moneyMajor.step
                  }
                  value={campaign.discountValue}
                  onChange={(event) =>
                    setCampaign((current) => ({
                      ...current,
                      discountValue:
                        current.discountType === "percentage"
                          ? Math.min(
                              MONETIZATION_ADMIN_CONSTRAINTS.percentageMajor
                                .max,
                              Math.max(
                                MONETIZATION_ADMIN_CONSTRAINTS.percentageMajor
                                  .min,
                                Number(event.target.value),
                              ),
                            )
                          : Math.max(
                              MONETIZATION_ADMIN_CONSTRAINTS.moneyMajor.min,
                              Number(event.target.value),
                            ),
                    }))
                  }
                />
              </FormField>
            ) : (
              <FormField label="Remise">
                <Input value="100 % pendant la période" disabled />
              </FormField>
            )}
            <FormField label="Activation" required>
              <select
                value={campaign.activationMode}
                onChange={(event) =>
                  setCampaign((current) => ({
                    ...current,
                    activationMode: event.target
                      .value as Promotion["activationMode"],
                  }))
                }
                className="h-control-touch w-full rounded-control border border-border-base bg-bg-surface px-3 text-sm"
              >
                <option value="coupon">Code coupon</option>
                <option value="automatic">Automatique</option>
                <option value="admin_grant">Attribution Admin</option>
              </select>
            </FormField>
            <FormField label="Clients éligibles" required>
              <select
                value={campaign.eligibleCustomerType}
                onChange={(event) =>
                  setCampaign((current) => ({
                    ...current,
                    eligibleCustomerType: event.target
                      .value as Promotion["eligibleCustomerType"],
                  }))
                }
                className="h-control-touch w-full rounded-control border border-border-base bg-bg-surface px-3 text-sm"
              >
                <option value="new">Nouveaux clients</option>
                <option value="existing">Clients existants</option>
                <option value="all">Tous les clients</option>
              </select>
            </FormField>
            <FormField label="Cumul" required>
              <select
                value={campaign.stackingPolicy}
                onChange={(event) =>
                  setCampaign((current) => ({
                    ...current,
                    stackingPolicy: event.target
                      .value as Promotion["stackingPolicy"],
                  }))
                }
                className="h-control-touch w-full rounded-control border border-border-base bg-bg-surface px-3 text-sm"
              >
                <option value="exclusive">Exclusif</option>
                <option value="best_only">Meilleure remise seulement</option>
                <option value="stackable">Cumulable</option>
              </select>
            </FormField>
            <FormField
              label="Utilisations totales"
              hint="0 signifie sans plafond global."
            >
              <Input
                type="number"
                min={MONETIZATION_ADMIN_CONSTRAINTS.nonNegativeInteger.min}
                value={campaign.maximumRedemptions}
                onChange={(event) =>
                  setCampaign((current) => ({
                    ...current,
                    maximumRedemptions: Math.max(
                      MONETIZATION_ADMIN_CONSTRAINTS.nonNegativeInteger.min,
                      Number(event.target.value),
                    ),
                  }))
                }
              />
            </FormField>
            <FormField label="Utilisations par compte" required>
              <Input
                type="number"
                min={MONETIZATION_ADMIN_CONSTRAINTS.positiveInteger.min}
                value={campaign.maximumRedemptionsPerAccount}
                onChange={(event) =>
                  setCampaign((current) => ({
                    ...current,
                    maximumRedemptionsPerAccount: Math.max(
                      MONETIZATION_ADMIN_CONSTRAINTS.positiveInteger.min,
                      Number(event.target.value),
                    ),
                  }))
                }
              />
            </FormField>
            <FormField
              label="Période gratuite (jours)"
              hint="0 désactive la phase gratuite de la campagne."
            >
              <Input
                type="number"
                min={MONETIZATION_ADMIN_CONSTRAINTS.nonNegativeInteger.min}
                value={campaign.freePeriodDays}
                onChange={(event) =>
                  setCampaign((current) => ({
                    ...current,
                    freePeriodDays: Math.max(
                      MONETIZATION_ADMIN_CONSTRAINTS.nonNegativeInteger.min,
                      Number(event.target.value),
                    ),
                  }))
                }
              />
            </FormField>
            <FormField label="Début" required>
              <Input
                type="datetime-local"
                value={campaign.startsAt}
                onChange={(event) =>
                  setCampaign((current) => ({
                    ...current,
                    startsAt: event.target.value,
                  }))
                }
              />
            </FormField>
            <FormField label="Fin" required>
              <Input
                type="datetime-local"
                value={campaign.endsAt}
                onChange={(event) =>
                  setCampaign((current) => ({
                    ...current,
                    endsAt: event.target.value,
                  }))
                }
              />
            </FormField>
            <FormField label="Périodes remisées" required>
              <Input
                type="number"
                min={MONETIZATION_ADMIN_CONSTRAINTS.positiveInteger.min}
                value={campaign.durationBillingPeriods}
                onChange={(event) =>
                  setCampaign((current) => ({
                    ...current,
                    durationBillingPeriods: Math.max(
                      MONETIZATION_ADMIN_CONSTRAINTS.positiveInteger.min,
                      Number(event.target.value),
                    ),
                  }))
                }
              />
            </FormField>
            <FormField label="Engagement minimal (périodes)">
              <Input
                type="number"
                min={MONETIZATION_ADMIN_CONSTRAINTS.nonNegativeInteger.min}
                value={campaign.minimumCommitmentPeriods}
                onChange={(event) =>
                  setCampaign((current) => ({
                    ...current,
                    minimumCommitmentPeriods: Math.max(
                      MONETIZATION_ADMIN_CONSTRAINTS.nonNegativeInteger.min,
                      Number(event.target.value),
                    ),
                  }))
                }
              />
            </FormField>
            <FormField
              label="Coupon du prestataire"
              hint="Identifiant Stripe requis avant une activation en production."
            >
              <Input
                value={campaign.providerCouponId}
                onChange={(event) =>
                  setCampaign((current) => ({
                    ...current,
                    providerCouponId: event.target.value,
                  }))
                }
                placeholder="coupon_…"
              />
            </FormField>
          </div>
          <FormField
            label="Motif du changement"
            required
            hint="Visible dans l’audit et par l’approbateur."
          >
            <Textarea
              rows={3}
              value={campaign.reason}
              onChange={(event) =>
                setCampaign((current) => ({
                  ...current,
                  reason: event.target.value,
                }))
              }
            />
          </FormField>
          <div className="rounded-control border border-warning-border bg-warning-surface p-3 text-xs text-stone-700">
            La campagne reste inactive jusqu’à publication du brouillon. Son
            type, son éligibilité, son cumul et ses plafonds sont appliqués par
            le même moteur lors du devis et du checkout.
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCampaignOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={
                saving ||
                campaign.reason.trim().length <
                  MONETIZATION_ADMIN_CONSTRAINTS.changeReason.minLength
              }
            >
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Ajouter au brouillon
            </Button>
          </div>
        </form>
      </Modal>

      <PromptModal
        isOpen={pendingTransition !== null}
        onClose={() => setPendingTransition(null)}
        onSubmit={(reason) => void confirmTransition(reason)}
        title={t("admin.monetization.transitionTitle")}
        label={t("admin.monetization.transitionReason")}
        initialValue={t("admin.monetization.transitionReasonDefault")}
        minLength={MONETIZATION_ADMIN_CONSTRAINTS.changeReason.minLength}
        multiline
        confirmText={t("common.confirm")}
      />
    </div>
  );
};
