import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  BillingOverview,
  BusinessVerticalCode,
  MonetizationCatalog,
  MonetizationPrice,
  MonetizationProduct,
  MonetizationQuote,
  MonetizationSubscription,
  SubscriptionChangePreview,
} from "@shongre/contracts/monetization";
import {
  hasCommercialEntitlementValue,
  isCommercialEntitlementOperational,
  isCommercialProductPurchasable,
} from "@shongre/contracts/monetization";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  CreditCard,
  FileText,
  Layers3,
  LockKeyhole,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";
import { services } from "../../api";
import { useTranslation } from "../../i18n/I18nProvider";
import { ScrollableRegion } from "../../design-system";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { Badge } from "../../design-system/primitives/Badge";
import { Button } from "../../design-system/primitives/Button";
import { Modal } from "../../design-system/primitives/Modal";
import { ProgressBar } from "../../design-system/primitives/ProgressBar";
import { usePageMeta } from "../../hooks/usePageMeta";
import { BillingHistoryModal } from "./components/BillingHistoryModal";
import { FormField, Input } from "../../design-system/primitives/FormField";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useRegionalFormatters } from "../../hooks/useRegionalFormatters";

type BillingInterval = "month" | "year";

const STATUS_LABELS: Record<string, string> = {
  trialing: "Période d’essai",
  active: "Actif",
  past_due: "Paiement à régulariser",
  paused: "En pause",
  cancellation_pending: "Résiliation programmée",
  cancelled: "Résilié",
  expired: "Expiré",
  suspended: "Suspendu",
  incomplete: "Activation en cours",
};

function displayEntitlement(value: string | number | boolean | string[]) {
  if (value === true) return "Inclus";
  if (value === false) return "Non inclus";
  if (value === "advanced") return "Avancé";
  if (value === "enterprise") return "Entreprise";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function priceFor(product: MonetizationProduct, interval: BillingInterval) {
  return (
    product.prices.find((price) => price.billingPeriod === interval) ||
    product.prices[0]
  );
}

const operationalEntitlements = (product: MonetizationProduct) =>
  product.entitlements.filter(
    (entitlement) =>
      isCommercialEntitlementOperational(entitlement) &&
      hasCommercialEntitlementValue(entitlement.value),
  );

function PriceDisplay({
  product,
  price,
  interval,
}: {
  product: MonetizationProduct;
  price: MonetizationPrice;
  interval: BillingInterval;
}) {
  const { formatMoneyMinor } = useRegionalFormatters();
  const isAnnual =
    product.kind === "subscription" && price.billingPeriod === "year";
  const displayAmount = isAnnual
    ? Math.round(price.amount.amountMinor / 12)
    : price.amount.amountMinor;
  return (
    <div className="min-h-20">
      <div className="flex items-end gap-1.5">
        <span className="text-3xl sm:text-4xl font-black tracking-tight text-text-main">
          {formatMoneyMinor(displayAmount, price.amount.currency)}
        </span>
        <span className="pb-1 text-xs font-semibold text-text-muted">
          HT / {product.kind === "subscription" ? "mois" : "option"}
        </span>
      </div>
      <p className="mt-1 text-xs text-text-muted">
        {isAnnual
          ? `Facturé ${formatMoneyMinor(price.amount.amountMinor, price.amount.currency)} HT par an`
          : product.kind === "subscription" && interval === "month"
            ? "Facturation mensuelle, sans engagement annuel"
            : product.audience === "individual"
              ? "Aucune carte requise"
              : "Paiement unique"}
      </p>
    </div>
  );
}

export const ProPlansPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser, isAuthenticated } = useAuth();
  const { activeMarket } = useMarketLocation();
  const { formatDate, formatMoneyMinor: formatMoney } = useRegionalFormatters();
  const toast = useToast();
  const operationSequence = useRef(0);
  const [catalog, setCatalog] = useState<MonetizationCatalog | null>(null);
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [selectedVertical, setSelectedVertical] =
    useState<BusinessVerticalCode>("general");
  const [selectedProduct, setSelectedProduct] =
    useState<MonetizationProduct | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<MonetizationPrice | null>(
    null,
  );
  const [quote, setQuote] = useState<MonetizationQuote | null>(null);
  const [changePreview, setChangePreview] =
    useState<SubscriptionChangePreview | null>(null);
  const [changeSourceSubscription, setChangeSourceSubscription] =
    useState<MonetizationSubscription | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [completedMessage, setCompletedMessage] = useState<string | null>(null);
  const [billingHistoryOpen, setBillingHistoryOpen] = useState(false);
  const [promotionCode, setPromotionCode] = useState("");

  usePageMeta({
    title: "Offres et forfaits professionnels",
    description:
      "Comparez les forfaits professionnels Shongre, leurs quotas, outils d’équipe, statistiques et options de visibilité.",
    canonicalPath: "/solutions-pro",
  });

  const loadCommercialState = useCallback(async () => {
    const [nextCatalog, nextBilling] = await Promise.all([
      services.businessRules.getCatalog(activeMarket.code),
      services.businessRules.getBillingOverview(),
    ]);
    setCatalog(nextCatalog);
    setBilling(nextBilling);
  }, [activeMarket.code]);

  useEffect(() => {
    let active = true;
    loadCommercialState().catch((error) => {
      if (active) {
        setCatalogError(
          error instanceof Error ? error.message : "Offres indisponibles",
        );
      }
    });
    return () => {
      active = false;
    };
  }, [loadCommercialState]);

  useEffect(() => {
    const verticalByProfile = {
      generic: "general",
      automotive: "auto",
      real_estate: "immo",
      employment: "emploi",
      education: "education",
    } as const;
    if (currentUser?.professionalVertical) {
      setSelectedVertical(verticalByProfile[currentUser.professionalVertical]);
    }
  }, [currentUser?.professionalVertical]);

  const verticals = useMemo(
    () =>
      (catalog?.verticals || [])
        .filter((vertical) => vertical.status === "active")
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [catalog],
  );

  const plans = useMemo(
    () =>
      catalog?.products.filter(
        (product) =>
          isCommercialProductPurchasable(product) &&
          product.kind === "subscription" &&
          product.commercialProfile.professionalOnly &&
          Boolean(product.commercialProfile.tier) &&
          (selectedVertical === "general"
            ? ["free", "generic"].includes(product.commercialProfile.planType)
            : product.commercialProfile.verticalId === selectedVertical),
      ) || [],
    [catalog, selectedVertical],
  );
  const boosts = useMemo(
    () =>
      catalog?.products.filter(
        (product) =>
          isCommercialProductPurchasable(product) &&
          ["pack", "credit_pack"].includes(product.kind) &&
          (product.commercialProfile.verticalId === selectedVertical ||
            (!product.commercialProfile.verticalId &&
              product.sourceConsumers.includes("solutions-pro"))),
      ) || [],
    [catalog, selectedVertical],
  );
  const comparisonRows = useMemo(() => {
    const keys = [
      ...new Set(
        plans.flatMap((plan) =>
          operationalEntitlements(plan).map((entry) => entry.key),
        ),
      ),
    ];
    return keys
      .map((key) => {
        const source = plans
          .flatMap(operationalEntitlements)
          .find((entry) => entry.key === key);
        return source ? { key, label: source.label } : null;
      })
      .filter((entry): entry is { key: string; label: string } =>
        Boolean(entry),
      );
  }, [plans]);

  const selectedFamilyId = plans[0]?.commercialProfile.familyId;
  const currentSubscription = billing?.subscriptions.find((subscription) => {
    const product = catalog?.products.find(
      (candidate) => candidate.id === subscription.productId,
    );
    return (
      product?.commercialProfile.familyId === selectedFamilyId &&
      [
        "trialing",
        "active",
        "past_due",
        "paused",
        "cancellation_pending",
      ].includes(subscription.status)
    );
  });
  const currentProduct = plans.find(
    (plan) => plan.id === currentSubscription?.productId,
  );
  const activeSubscriptions =
    billing?.subscriptions.filter((subscription) =>
      [
        "trialing",
        "active",
        "past_due",
        "paused",
        "cancellation_pending",
      ].includes(subscription.status),
    ) || [];

  const closeCheckout = () => {
    if (isConfirming) return;
    setSelectedProduct(null);
    setSelectedPrice(null);
    setQuote(null);
    setChangePreview(null);
    setChangeSourceSubscription(null);
    setCompletedMessage(null);
    setPromotionCode("");
  };

  const prepareOffer = async (
    product: MonetizationProduct,
    price: MonetizationPrice,
    replacementSource?: MonetizationSubscription,
  ) => {
    if (product.id === currentSubscription?.productId) return;
    const sourceSubscription = replacementSource || currentSubscription;
    setSelectedProduct(product);
    setSelectedPrice(price);
    setQuote(null);
    setChangePreview(null);
    setChangeSourceSubscription(sourceSubscription || null);
    setCompletedMessage(null);
    setIsPreparing(true);
    operationSequence.current += 1;
    const operationKey = `solutions-pro:${product.id}:${price.id}:${operationSequence.current}`;
    try {
      if (sourceSubscription) {
        setChangePreview(
          await services.businessRules.previewSubscriptionChange({
            subscriptionId: sourceSubscription.id,
            targetProductId: product.id,
            targetPriceId: price.id,
            idempotencyKey: operationKey,
          }),
        );
      } else {
        setQuote(
          await services.businessRules.createQuote({
            productIds: [product.id],
            priceIds: { [product.id]: price.id },
            marketCode: activeMarket.code,
            categoryId: catalog?.verticals.find(
              (vertical) => vertical.id === selectedVertical,
            )?.categoryIds[0],
            idempotencyKey: operationKey,
          }),
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de préparer l’offre.",
      );
      closeCheckout();
    } finally {
      setIsPreparing(false);
    }
  };

  const applyPromotion = async () => {
    if (!selectedProduct || !selectedPrice || !promotionCode.trim()) return;
    setIsPreparing(true);
    operationSequence.current += 1;
    try {
      setQuote(
        await services.businessRules.createQuote({
          productIds: [selectedProduct.id],
          priceIds: { [selectedProduct.id]: selectedPrice.id },
          marketCode: activeMarket.code,
          categoryId: catalog?.verticals.find(
            (vertical) => vertical.id === selectedVertical,
          )?.categoryIds[0],
          promotionCode: promotionCode.trim(),
          idempotencyKey: `promotion:${selectedProduct.id}:${operationSequence.current}`,
        }),
      );
      toast.success("La campagne a été vérifiée et appliquée au devis.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Code indisponible.",
      );
    } finally {
      setIsPreparing(false);
    }
  };

  const confirmOffer = async () => {
    if (!selectedProduct || !selectedPrice) return;
    setIsConfirming(true);
    operationSequence.current += 1;
    const operationKey = `confirm:${selectedProduct.id}:${selectedPrice.id}:${operationSequence.current}`;
    try {
      if (changePreview && changeSourceSubscription) {
        await services.businessRules.applySubscriptionChange({
          subscriptionId: changeSourceSubscription.id,
          targetProductId: selectedProduct.id,
          targetPriceId: selectedPrice.id,
          idempotencyKey: operationKey,
        });
        setCompletedMessage(
          changePreview.effectiveAt === "immediately"
            ? "Votre nouveau forfait est actif."
            : `Le changement est programmé au ${formatDate(changePreview.nextBillingAt)}.`,
        );
      } else if (quote) {
        const order = await services.businessRules.createCheckout(
          quote.id,
          operationKey,
        );
        setCompletedMessage(
          quote.trial
            ? `Votre essai de ${quote.trial.durationDays} jours est actif. Prochain débit le ${formatDate(quote.trial.endsAt)}.`
            : order.status === "paid"
              ? "Paiement confirmé : votre forfait et vos droits sont actifs."
              : "Votre paiement est en cours de traitement.",
        );
      }
      await loadCommercialState();
      toast.success("Votre espace de facturation a été mis à jour.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "L’opération n’a pas abouti.",
      );
    } finally {
      setIsConfirming(false);
    }
  };

  const toggleCancellation = async () => {
    if (!currentSubscription) return;
    try {
      await services.businessRules.updateSubscriptionCancellation({
        subscriptionId: currentSubscription.id,
        cancelAtPeriodEnd: !currentSubscription.cancelAtPeriodEnd,
      });
      await loadCommercialState();
      toast.success(
        currentSubscription.cancelAtPeriodEnd
          ? "Votre abonnement est réactivé."
          : "La résiliation est programmée à la fin de la période payée.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Action indisponible.",
      );
    }
  };

  return (
    <div className="pb-16">
      <section className="border-b border-border-subtle bg-bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-border bg-primary-light px-3 py-1 text-xs font-bold text-primary">
            <Sparkles className="w-icon-sm h-icon-sm" aria-hidden="true" />
            Solutions Shongre Pro
          </div>
          <h1 className="mx-auto mt-4 max-w-4xl text-3xl sm:text-4xl font-black tracking-tight text-text-main">
            Développez votre activité avec Shongre Pro
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-text-secondary">
            Choisissez les outils adaptés à votre volume. Les prix, taxes,
            quotas et dates d’effet sont confirmés avant chaque paiement.
          </p>
          <div
            className="mx-auto mt-7 flex max-w-3xl flex-wrap justify-center gap-2"
            role="tablist"
            aria-label="Activité professionnelle"
          >
            {verticals.map((vertical) => (
              <button
                key={vertical.id}
                type="button"
                role="tab"
                aria-selected={selectedVertical === vertical.id}
                onClick={() => setSelectedVertical(vertical.id)}
                className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  selectedVertical === vertical.id
                    ? "border-primary bg-primary text-white"
                    : "border-border-base bg-bg-surface text-text-secondary hover:border-primary-border hover:text-text-main"
                }`}
              >
                {vertical.name}
              </button>
            ))}
          </div>
          <div
            className="mx-auto mt-5 grid max-w-md grid-cols-2 rounded-control border border-border-base bg-bg-base p-1"
            role="group"
            aria-label="Période de facturation"
          >
            <button
              type="button"
              onClick={() => setInterval("month")}
              aria-pressed={interval === "month"}
              className={`rounded-control px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                interval === "month"
                  ? "bg-bg-surface text-text-main shadow-xs"
                  : "text-text-secondary hover:text-text-main"
              }`}
            >
              Mensuel
            </button>
            <button
              type="button"
              onClick={() => setInterval("year")}
              aria-pressed={interval === "year"}
              className={`rounded-control px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                interval === "year"
                  ? "bg-primary text-white shadow-xs"
                  : "text-text-secondary hover:text-text-main"
              }`}
            >
              Annuel · économisez
            </button>
          </div>
          <p className="mt-3 text-xs text-text-muted">
            Tarifs professionnels affichés hors taxes. TVA française de 20 %
            appliquée au paiement, sauf règle fiscale contraire.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {!catalog && !catalogError && (
          <div
            className="my-8 rounded-card border border-border-base bg-bg-surface p-8 text-center text-sm font-semibold text-text-secondary"
            aria-live="polite"
          >
            Chargement des offres actives…
          </div>
        )}
        {catalogError && (
          <div
            className="my-8 rounded-card border border-danger-border bg-danger-surface p-4 text-sm font-semibold text-danger"
            role="alert"
          >
            {catalogError}
          </div>
        )}

        {catalog && (
          <>
            <section aria-labelledby="plans-title" className="py-8 sm:py-10">
              <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2
                    id="plans-title"
                    className="text-xl sm:text-2xl font-black text-text-main"
                  >
                    Un forfait pour chaque étape
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    {catalog.verticals.find(
                      (vertical) => vertical.id === selectedVertical,
                    )?.description ||
                      "Niveaux issus du catalogue commercial actif."}
                  </p>
                </div>
                <span className="text-xs text-text-muted">
                  Catalogue v{catalog.versionNumber} · marché{" "}
                  {catalog.marketCode}
                </span>
              </div>

              <div
                className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${plans.length <= 3 ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}
              >
                {plans.map((plan) => {
                  const price = priceFor(plan, interval);
                  const isCurrent = currentSubscription?.productId === plan.id;
                  const canTransition =
                    !currentSubscription ||
                    isCurrent ||
                    Boolean(
                      currentProduct?.commercialProfile.upgradeProductIds.includes(
                        plan.id,
                      ) ||
                      currentProduct?.commercialProfile.downgradeProductIds.includes(
                        plan.id,
                      ),
                    );
                  const trialDays = plan.commercialProfile.trialPolicy.enabled
                    ? plan.commercialProfile.trialPolicy.durationDays
                    : undefined;
                  const replacementCandidates = !currentSubscription
                    ? activeSubscriptions.filter((subscription) => {
                        const sourceProduct = catalog.products.find(
                          (candidate) =>
                            candidate.id === subscription.productId,
                        );
                        return Boolean(
                          sourceProduct &&
                          sourceProduct.commercialProfile.familyId !==
                            plan.commercialProfile.familyId &&
                          (sourceProduct.commercialProfile.upgradeProductIds.includes(
                            plan.id,
                          ) ||
                            sourceProduct.commercialProfile.downgradeProductIds.includes(
                              plan.id,
                            )),
                        );
                      })
                    : [];
                  const replacementSource =
                    replacementCandidates.length === 1
                      ? replacementCandidates[0]
                      : undefined;
                  const replacementSourceProduct = catalog.products.find(
                    (candidate) =>
                      candidate.id === replacementSource?.productId,
                  );
                  const monthly = plan.prices.find(
                    (entry) => entry.billingPeriod === "month",
                  );
                  const annual = plan.prices.find(
                    (entry) => entry.billingPeriod === "year",
                  );
                  const annualSaving =
                    monthly && annual
                      ? monthly.amount.amountMinor * 12 -
                        annual.amount.amountMinor
                      : 0;
                  return (
                    <article
                      key={plan.id}
                      className={`relative flex min-w-0 flex-col rounded-card border bg-bg-surface p-5 shadow-xs ${
                        plan.recommended
                          ? "border-primary ring-1 ring-primary"
                          : "border-border-base"
                      }`}
                    >
                      {plan.recommended && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-micro font-black uppercase tracking-wide text-white shadow-xs">
                          Recommandé
                        </span>
                      )}
                      {trialDays && !isCurrent && (
                        <span className="mb-3 inline-flex w-fit rounded-full bg-success-surface px-2.5 py-1 text-micro font-black uppercase tracking-wide text-success">
                          {trialDays} jours d’essai
                        </span>
                      )}
                      <div className="flex min-h-14 items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-black text-text-main">
                            {plan.name}
                          </h3>
                          <p className="mt-1 text-xs leading-relaxed text-text-muted">
                            {plan.description}
                          </p>
                        </div>
                        {isCurrent && (
                          <Badge variant="verified" size="sm">
                            Actuel
                          </Badge>
                        )}
                      </div>
                      <div className="mt-5">
                        <PriceDisplay
                          product={plan}
                          price={price}
                          interval={interval}
                        />
                        {interval === "year" && annualSaving > 0 && (
                          <p className="mt-1 text-xs font-bold text-success">
                            Économie annuelle : {formatMoney(annualSaving)}
                          </p>
                        )}
                      </div>
                      <div className="my-5 border-t border-border-subtle" />
                      <ul className="flex-1 space-y-2.5 text-xs text-text-secondary">
                        {operationalEntitlements(plan)
                          .slice(0, 6)
                          .map((entitlement) => (
                            <li
                              key={entitlement.key}
                              className="flex items-start gap-2.5"
                            >
                              <Check
                                className="mt-0.5 h-icon-md w-icon-md shrink-0 text-success"
                                aria-hidden="true"
                              />
                              <span>
                                {entitlement.label}
                                {entitlement.availability === "beta"
                                  ? " (bêta)"
                                  : ""}{" "}
                                :{" "}
                                <strong className="font-bold text-text-main">
                                  {displayEntitlement(entitlement.value)}
                                </strong>
                              </span>
                            </li>
                          ))}
                      </ul>
                      <div className="mt-6 space-y-2">
                        {plan.audience === "individual" ? (
                          <Button
                            to="/inscription/particulier"
                            variant="outline"
                            fullWidth
                          >
                            Commencer gratuitement
                          </Button>
                        ) : !isAuthenticated ? (
                          <Button
                            to="/inscription/professionnel"
                            variant={plan.recommended ? "primary" : "outline"}
                            fullWidth
                          >
                            Créer un compte Pro
                          </Button>
                        ) : (
                          <Button
                            variant={plan.recommended ? "primary" : "outline"}
                            fullWidth
                            disabled={isCurrent || !canTransition}
                            onClick={() => void prepareOffer(plan, price)}
                          >
                            {isCurrent
                              ? "Forfait actuel"
                              : !canTransition
                                ? "Transition indisponible"
                                : currentSubscription
                                  ? "Changer de forfait"
                                  : trialDays
                                    ? `Essayer ${trialDays} jours`
                                    : activeSubscriptions.length > 0
                                      ? "Ajouter ce forfait"
                                      : "Choisir ce forfait"}
                          </Button>
                        )}
                        {isAuthenticated &&
                          !currentSubscription &&
                          replacementSource &&
                          replacementSourceProduct && (
                            <Button
                              variant="ghost"
                              size="sm"
                              fullWidth
                              onClick={() =>
                                void prepareOffer(
                                  plan,
                                  price,
                                  replacementSource,
                                )
                              }
                            >
                              Remplacer {replacementSourceProduct.name}
                            </Button>
                          )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="comparison-title" className="pb-10">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h2
                    id="comparison-title"
                    className="text-xl font-black text-text-main"
                  >
                    Comparez les fonctionnalités
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Les droits sont versionnés avec le forfait souscrit.
                  </p>
                </div>
                <Layers3
                  className="h-icon-xl w-icon-xl text-primary"
                  aria-hidden="true"
                />
              </div>
              <ScrollableRegion
                aria-label={t("pro.plans.comparisonTableLabel")}
                className="rounded-card border border-border-base bg-bg-surface shadow-xs"
              >
                <table className="w-full min-w-190 border-collapse text-xs">
                  <thead>
                    <tr className="bg-bg-subtle text-left text-text-main">
                      <th scope="col" className="px-4 py-3 font-black">
                        Fonctionnalité
                      </th>
                      {plans.map((plan) => (
                        <th
                          key={plan.id}
                          scope="col"
                          className="px-4 py-3 text-center font-black"
                        >
                          {plan.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {comparisonRows.map((row) => (
                      <tr key={row.key}>
                        <th
                          scope="row"
                          className="px-4 py-3 text-left font-semibold text-text-secondary"
                        >
                          {row.label}
                        </th>
                        {plans.map((plan) => {
                          const entitlement = operationalEntitlements(
                            plan,
                          ).find((entry) => entry.key === row.key);
                          return (
                            <td
                              key={plan.id}
                              className="px-4 py-3 text-center font-semibold text-text-main"
                            >
                              {entitlement
                                ? displayEntitlement(entitlement.value)
                                : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollableRegion>
            </section>

            <section
              aria-labelledby="boosts-title"
              className="border-t border-border-subtle py-10"
            >
              <div className="mb-5">
                <h2
                  id="boosts-title"
                  className="text-xl sm:text-2xl font-black text-text-main"
                >
                  Options de visibilité, à la carte
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Choisissez d’abord l’annonce à promouvoir : aucun achat n’est
                  présélectionné.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {boosts.slice(0, 4).map((boost) => {
                  const price = boost.prices[0];
                  return (
                    <article
                      key={boost.id}
                      className="flex rounded-card border border-border-base bg-bg-surface p-4 shadow-xs"
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="mb-4 flex items-start gap-3">
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary-border bg-primary-light text-primary">
                            <Zap
                              className="h-icon-lg w-icon-lg"
                              aria-hidden="true"
                            />
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-black text-text-main">
                              {boost.name}
                            </h3>
                            <p className="mt-0.5 text-xs text-text-muted">
                              {price.durationDays
                                ? `${price.durationDays} jours`
                                : "Activation unique"}
                            </p>
                          </div>
                        </div>
                        <p className="flex-1 text-xs leading-relaxed text-text-secondary">
                          {boost.description}
                        </p>
                        <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3">
                          <strong className="text-base text-text-main">
                            {formatMoney(
                              price.amount.amountMinor,
                              price.amount.currency,
                            )}{" "}
                            HT
                          </strong>
                          <Button
                            to={
                              isAuthenticated
                                ? "/compte/annonces"
                                : "/connexion"
                            }
                            variant="outline"
                            size="sm"
                            rightIcon={
                              <ChevronRight className="h-icon-md w-icon-md" />
                            }
                          >
                            Choisir l’annonce
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-text-muted">
                Les placements rémunérés restent identifiables. Leur
                disponibilité dépend de l’annonce, du marché et de la catégorie.
              </p>
            </section>

            <section
              aria-labelledby="billing-title"
              className="rounded-card border border-border-base bg-bg-surface p-5 sm:p-6 shadow-xs"
            >
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2
                    id="billing-title"
                    className="text-xl font-black text-text-main"
                  >
                    Votre abonnement et votre usage
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    État du forfait, quotas, échéance et documents au même
                    endroit.
                  </p>
                </div>
                {currentSubscription && (
                  <Badge
                    variant={
                      currentSubscription.status === "past_due"
                        ? "urgent"
                        : "verified"
                    }
                  >
                    {STATUS_LABELS[currentSubscription.status] ||
                      currentSubscription.status}
                  </Badge>
                )}
              </div>
              {billing?.subscriptions.some((subscription) =>
                [
                  "trialing",
                  "active",
                  "past_due",
                  "cancellation_pending",
                ].includes(subscription.status),
              ) && (
                <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {billing.subscriptions
                    .filter((subscription) =>
                      [
                        "trialing",
                        "active",
                        "past_due",
                        "cancellation_pending",
                      ].includes(subscription.status),
                    )
                    .map((subscription) => {
                      const product = catalog.products.find(
                        (candidate) => candidate.id === subscription.productId,
                      );
                      const vertical = catalog.verticals.find(
                        (candidate) =>
                          candidate.id ===
                          (product?.commercialProfile.verticalId || "general"),
                      );
                      return (
                        <button
                          key={subscription.id}
                          type="button"
                          onClick={() =>
                            setSelectedVertical(
                              product?.commercialProfile.verticalId ||
                                "general",
                            )
                          }
                          className="rounded-card border border-border-base bg-bg-subtle p-3 text-left focus-visible:outline-2 focus-visible:outline-primary"
                        >
                          <span className="text-micro font-black uppercase tracking-wide text-primary-hover">
                            {vertical?.name || "Général"}
                          </span>
                          <span className="mt-1 block text-sm font-black text-text-main">
                            {product?.name || subscription.productId}
                          </span>
                          <span className="mt-1 block text-xs text-text-secondary">
                            {STATUS_LABELS[subscription.status] ||
                              subscription.status}{" "}
                            · au {formatDate(subscription.currentPeriodEnd)}
                          </span>
                        </button>
                      );
                    })}
                </div>
              )}
              <div className="grid gap-6 lg:grid-cols-plans-tiers lg:divide-x lg:divide-border-subtle">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Forfait actuel
                  </p>
                  <p className="mt-2 text-lg font-black text-text-main">
                    {currentProduct?.name || "Aucun forfait actif"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    {currentSubscription
                      ? `${currentSubscription.billingPeriod === "year" ? "Annuel" : "Mensuel"} · prochaine échéance le ${formatDate(currentSubscription.currentPeriodEnd)}`
                      : "Choisissez un forfait professionnel pour activer vos droits."}
                  </p>
                  {currentSubscription?.scheduledProductId && (
                    <p className="mt-3 rounded-control bg-info-surface px-3 py-2 text-xs font-semibold text-info">
                      Changement programmé au{" "}
                      {formatDate(currentSubscription.scheduledChangeAt)}.
                    </p>
                  )}
                </div>
                <div className="lg:px-6">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Usage de la période
                  </p>
                  <div className="mt-3 space-y-4">
                    {billing?.usage.length ? (
                      billing.usage.map((usage) => {
                        const percent = usage.limit
                          ? Math.min(
                              100,
                              Math.round((usage.used / usage.limit) * 100),
                            )
                          : 0;
                        return (
                          <div key={usage.key}>
                            <div className="mb-1.5 flex items-center justify-between gap-4 text-xs">
                              <span className="font-semibold text-text-secondary">
                                {usage.label}
                              </span>
                              <span className="font-bold text-text-main">
                                {usage.used} / {usage.limit ?? "∞"}
                              </span>
                            </div>
                            <ProgressBar value={percent} label={usage.label} />
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-text-muted">
                        Aucun quota consommé pour le moment.
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2 lg:pl-6">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Actions
                  </p>
                  <button
                    type="button"
                    onClick={() => setBillingHistoryOpen(true)}
                    className="flex w-full items-center justify-between rounded-control px-2 py-2 text-left text-xs font-semibold text-text-secondary hover:bg-bg-subtle focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <span className="inline-flex items-center gap-2">
                      <FileText
                        className="h-icon-md w-icon-md"
                        aria-hidden="true"
                      />{" "}
                      Factures ({billing?.invoices.length || 0})
                    </span>
                    <ChevronRight
                      className="h-icon-md w-icon-md"
                      aria-hidden="true"
                    />
                  </button>
                  <Button
                    to="/compte"
                    variant="ghost"
                    size="sm"
                    fullWidth
                    className="justify-between"
                    rightIcon={<ChevronRight className="h-icon-md w-icon-md" />}
                  >
                    Gérer le profil de facturation
                  </Button>
                  {currentSubscription && (
                    <Button
                      variant={
                        currentSubscription.cancelAtPeriodEnd
                          ? "outline"
                          : "ghost"
                      }
                      size="sm"
                      fullWidth
                      onClick={() => void toggleCancellation()}
                      leftIcon={<RotateCcw className="h-icon-md w-icon-md" />}
                    >
                      {currentSubscription.cancelAtPeriodEnd
                        ? "Réactiver le forfait"
                        : "Résilier à l’échéance"}
                    </Button>
                  )}
                </div>
              </div>
            </section>

            <section aria-labelledby="faq-title" className="py-10">
              <div className="mb-4 flex items-center gap-2">
                <CircleHelp
                  className="h-icon-lg w-icon-lg text-primary"
                  aria-hidden="true"
                />
                <h2
                  id="faq-title"
                  className="text-xl font-black text-text-main"
                >
                  Questions fréquentes
                </h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  [
                    "La TVA est-elle incluse ?",
                    "Non. Les prix Pro sont affichés HT. Le récapitulatif contractuel détaille le sous-total, la remise éventuelle, la TVA et le total TTC avant confirmation.",
                  ],
                  [
                    "Puis-je changer de forfait ?",
                    "Oui. Une montée en gamme peut être immédiate avec prorata. Une baisse est programmée à la prochaine échéance afin de préserver les droits déjà payés.",
                  ],
                  [
                    "Comment fonctionne la résiliation ?",
                    "La résiliation prend effet à la fin de la période payée. Vous pouvez la retirer avant cette date depuis le même espace.",
                  ],
                  [
                    "Mes annonces sont-elles conservées ?",
                    "Oui. Le changement de forfait ne duplique ni ne supprime vos annonces. Les limites applicables sont recalculées à la date d’effet annoncée.",
                  ],
                ].map(([question, answer]) => (
                  <details
                    key={question}
                    className="group rounded-card border border-border-base bg-bg-surface p-4"
                  >
                    <summary className="cursor-pointer list-none font-bold text-sm text-text-main focus-visible:outline-2 focus-visible:outline-primary">
                      <span className="flex items-center justify-between gap-3">
                        {question}
                        <ChevronRight
                          className="h-icon-md w-icon-md shrink-0 transition-transform group-open:rotate-90"
                          aria-hidden="true"
                        />
                      </span>
                    </summary>
                    <p className="mt-3 text-xs leading-relaxed text-text-secondary">
                      {answer}
                    </p>
                  </details>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 border-t border-border-subtle pt-6 text-xs text-text-muted">
                <span className="inline-flex items-center gap-2">
                  <LockKeyhole
                    className="h-icon-md w-icon-md"
                    aria-hidden="true"
                  />{" "}
                  Paiement sécurisé par le prestataire configuré
                </span>
                <span className="inline-flex items-center gap-2">
                  <CreditCard
                    className="h-icon-md w-icon-md"
                    aria-hidden="true"
                  />{" "}
                  Aucun achat présélectionné
                </span>
                <Button
                  to="/support"
                  variant="ghost"
                  size="sm"
                  rightIcon={<ArrowRight className="h-icon-md w-icon-md" />}
                >
                  Contacter le support
                </Button>
              </div>
            </section>
          </>
        )}
      </div>

      <Modal
        isOpen={Boolean(selectedProduct)}
        onClose={closeCheckout}
        title={
          completedMessage
            ? "Opération confirmée"
            : `Confirmer ${selectedProduct?.name || "l’offre"}`
        }
        description="Le récapitulatif est calculé par le service commercial à partir du catalogue actif."
        maxWidth="lg"
      >
        {completedMessage ? (
          <div className="space-y-5 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-surface text-success">
              <Check className="h-icon-xl w-icon-xl" aria-hidden="true" />
            </span>
            <p className="font-bold text-text-main">{completedMessage}</p>
            <Button onClick={closeCheckout} fullWidth>
              Fermer
            </Button>
          </div>
        ) : isPreparing || (!quote && !changePreview) ? (
          <div
            className="py-8 text-center text-sm font-semibold text-text-secondary"
            aria-live="polite"
          >
            Calcul du prix, des taxes et de la date d’effet…
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-card border border-border-base bg-bg-subtle p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-black text-text-main">
                    {selectedProduct?.name}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {selectedProduct?.description}
                  </p>
                </div>
                <Badge variant="neutral">
                  {selectedPrice?.billingPeriod === "year"
                    ? "Annuel"
                    : "Mensuel"}
                </Badge>
              </div>
            </div>
            {quote && (
              <>
                {quote.trial && (
                  <div className="rounded-card border border-success-border bg-success-surface p-3 text-sm text-success">
                    <strong>Essai de {quote.trial.durationDays} jours</strong>
                    <p className="mt-1 text-xs leading-relaxed">
                      Aucun débit aujourd’hui. Conversion automatique le{" "}
                      {formatDate(quote.trial.endsAt)} selon le moyen de
                      paiement confirmé.
                    </p>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <FormField
                    label="Code promotionnel"
                    className="min-w-0 flex-1"
                  >
                    <Input
                      value={promotionCode}
                      onChange={(event) =>
                        setPromotionCode(event.target.value.toUpperCase())
                      }
                      placeholder="Ex. AUTO2026"
                    />
                  </FormField>
                  <Button
                    variant="outline"
                    onClick={() => void applyPromotion()}
                    disabled={!promotionCode.trim() || isPreparing}
                  >
                    Appliquer
                  </Button>
                </div>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-text-secondary">Sous-total HT</dt>
                    <dd className="font-bold text-text-main">
                      {formatMoney(quote.subtotalMinor, quote.currency)}
                    </dd>
                  </div>
                  {quote.discountMinor > 0 && (
                    <>
                      <div className="flex justify-between gap-4 text-success">
                        <dt>Remise</dt>
                        <dd className="font-bold">
                          − {formatMoney(quote.discountMinor, quote.currency)}
                        </dd>
                      </div>
                      {quote.promotion && (
                        <div className="rounded-control border border-success-border bg-success-surface px-3 py-2 text-xs text-success">
                          <strong>
                            {quote.promotion.name} · {quote.promotion.code}
                          </strong>
                          <p className="mt-1">
                            {quote.promotion.durationBillingPeriods
                              ? `Tarif appliqué pendant ${quote.promotion.durationBillingPeriods} période${quote.promotion.durationBillingPeriods > 1 ? "s" : ""} de facturation.`
                              : "Remise appliquée à cette échéance."}{" "}
                            Campagne valable jusqu’au{" "}
                            {formatDate(quote.promotion.endsAt)}.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between gap-4">
                    <dt className="text-text-secondary">TVA</dt>
                    <dd className="font-bold text-text-main">
                      {formatMoney(quote.taxMinor, quote.currency)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-border-base pt-3 text-base">
                    <dt className="font-black text-text-main">
                      Dû aujourd’hui
                    </dt>
                    <dd className="font-black text-text-main">
                      {formatMoney(quote.amountDueTodayMinor, quote.currency)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-text-secondary">
                      Prochaine échéance
                      {quote.nextChargeAt
                        ? ` · ${formatDate(quote.nextChargeAt)}`
                        : ""}
                    </dt>
                    <dd className="font-bold text-text-main">
                      {formatMoney(quote.nextChargeMinor, quote.currency)}
                    </dd>
                  </div>
                </dl>
              </>
            )}
            {changePreview && (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Date d’effet</dt>
                  <dd className="font-bold text-text-main">
                    {changePreview.effectiveAt === "immediately"
                      ? "Immédiatement"
                      : formatDate(changePreview.nextBillingAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Prorata HT</dt>
                  <dd className="font-bold text-text-main">
                    {formatMoney(
                      changePreview.proration.amountMinor,
                      changePreview.proration.currency,
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">TVA due maintenant</dt>
                  <dd className="font-bold text-text-main">
                    {formatMoney(
                      changePreview.tax.amountMinor,
                      changePreview.tax.currency,
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-border-base pt-3">
                  <dt className="font-black text-text-main">
                    Total dû maintenant
                  </dt>
                  <dd className="font-black text-text-main">
                    {formatMoney(
                      changePreview.totalDueNow.amountMinor,
                      changePreview.totalDueNow.currency,
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Prochaine période TTC</dt>
                  <dd className="font-bold text-text-main">
                    {formatMoney(
                      changePreview.nextPeriodTotal.amountMinor,
                      changePreview.nextPeriodTotal.currency,
                    )}
                  </dd>
                </div>
              </dl>
            )}
            <p className="rounded-control bg-info-surface px-3 py-2 text-xs leading-relaxed text-info">
              En confirmant, vous acceptez la date d’effet, les droits associés
              et le montant affiché. Aucun prix n’est recalculé dans cette
              interface.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={closeCheckout}
                disabled={isConfirming}
              >
                Annuler
              </Button>
              <Button
                onClick={() => void confirmOffer()}
                isLoading={isConfirming}
                leftIcon={<CreditCard className="h-icon-md w-icon-md" />}
              >
                {changePreview?.effectiveAt === "period_end"
                  ? "Programmer le changement"
                  : "Confirmer"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <BillingHistoryModal
        isOpen={billingHistoryOpen}
        onClose={() => setBillingHistoryOpen(false)}
        userType="professional"
      />
    </div>
  );
};
