import React, { useState, useEffect, useMemo, useRef } from "react";
import { Select } from "../../design-system";
import { scrollToTop } from "../../utilities/motion";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Camera,
  Trash2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Truck,
  MapPin,
  ShieldCheck,
  Tag,
  Bot,
  Search,
  Check,
  ChevronRight,
  Clock,
  Gift,
  ArrowLeftRight,
  KeyRound,
  Wrench,
  Briefcase,
  Store,
  Package,
  Globe,
} from "lucide-react";
import {
  taxonomyService,
  getTaxonomyLabel,
} from "../../domains/taxonomy/taxonomy.service";
import { publicationResolver } from "../../domains/publication/publication.resolver";
import { transactionCapabilitiesService } from "../../domains/transaction/transaction.capabilities";
import { fulfillmentResolver } from "../../domains/fulfillment/fulfillment.resolver";
import { publicationService } from "../../domains/publication/publication.service";
import { marketService } from "../../domains/market/market.service";
import {
  PublicationDraftState,
  ListingIntent,
  PackageSizeTier,
  PriceModel,
} from "../../domains/publication/publication.types";
import { Button } from "../../design-system/primitives/Button";
import {
  Input,
  Textarea,
  Checkbox,
  FormField,
} from "../../design-system/primitives/FormField";
import { Badge } from "../../design-system/primitives/Badge";
import { ListingCard } from "../../design-system/primitives/ListingCard";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { services } from "../../api/client/service-registry";
import { ListingAssistanceResult } from "../../api/contracts/ai.contract";
import type { ListingBoostOption } from "../../configuration/plans.config";
import { formatPrice, plural } from "../../utilities/formatters";
import { CategoryIcon } from "../../design-system/primitives/CategoryIcon";
import { Image } from "../../design-system/primitives/Image";
import { ProgressBar } from "../../design-system/primitives/ProgressBar";
import { useTranslation } from "../../i18n/I18nProvider";
import { usePageMeta } from "../../hooks/usePageMeta";
import {
  CONTROL_FOCUS_CLASS,
  CONTROL_MOTION_CLASS,
} from "../../design-system/utils/controlMetrics";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { PUBLICATION_CONSTRAINTS } from "@shongre/contracts";
import { analyticsService } from "../../services/analytics.service";

/**
 * Publication is three phases, not ten steps.
 *
 * Each phase still renders the original panels — they were already self-contained
 * cards — but they now scroll together under one heading instead of costing a
 * forward commitment each. Ten sequential screens to list a second-hand item was
 * the biggest drop-off risk in the seller funnel; the reference competitor is
 * effectively one long form, and the draft here already auto-saves, which is what
 * makes a longer page safe.
 *
 * `panels` are the legacy step ids, kept so the existing panel JSX is untouched.
 */
const PHASES = [
  {
    id: 1,
    label: "Ce que vous vendez",
    hint: "Catégorie, caractéristiques et photos",
    panels: [1, 2, 3],
  },
  {
    id: 2,
    label: "Votre annonce",
    hint: "Titre, description et prix",
    panels: [4, 5],
  },
  {
    id: 3,
    label: "Remise & livraison",
    hint: "Paiement, expédition et localisation",
    // 9 (marchés & visibilité) sits behind an "options avancées" disclosure and
    // 10 is the inline review, rather than two more full screens.
    panels: [6, 7, 8, 9, 10],
  },
];

const ADVANCED_PANEL = 9;
const REVIEW_PANEL = 10;

const PRICE_MODEL_LABELS: Record<PriceModel, string> = {
  fixed: "Prix fixe",
  negotiable: "Prix négociable",
  free: "Gratuit",
  on_request: "Sur demande / sur devis",
  hourly: "Tarif horaire",
  daily: "Tarif journalier",
  monthly: "Montant mensuel",
  rent_plus_charges: "Loyer + charges",
};

export const PublishWizard: React.FC = () => {
  const { t } = useTranslation();
  const { currencySymbol } = useMarketLocation();
  usePageMeta({
    title: t("meta.publishWizard.title"),
    description: t("meta.publishWizard.description"),
    canonicalPath: "/deposer",
    noIndex: true,
  });

  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();
  const defaultMarket = marketService.getDefaultMarket();
  const defaultMarketConfig = marketService.getEffectiveConfig(
    defaultMarket.code,
  );
  const defaultMarketCode = defaultMarket.code;
  const defaultCurrency = defaultMarketConfig.localization.defaultCurrency;

  const [currentStep, setCurrentStep] = useState(1); // phase index, 1..3
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isGeneratingWithAI, setIsGeneratingWithAI] = useState(false);
  const [aiPromptKeyword] = useState("");
  const [, setAiGeneratedTips] = useState<string[]>([]);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [visibilityOffers, setVisibilityOffers] = useState<
    ListingBoostOption[]
  >([]);
  const [visibilityOffersState, setVisibilityOffersState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const publicationStarted = useRef(false);

  // Draft State initialized with default or restored values
  const [draft, setDraft] = useState<PublicationDraftState>(() => {
    const initialMarkets =
      currentUser?.defaultPublicationMarkets &&
      currentUser.defaultPublicationMarkets.length > 0
        ? currentUser.defaultPublicationMarkets
        : [defaultMarketCode];
    const primaryMarketCode = initialMarkets[0] || defaultMarketCode;
    const primaryCurrency =
      marketService.getEffectiveConfig(primaryMarketCode).localization
        .defaultCurrency;

    return {
      marketCode: primaryMarketCode,
      selectedMarkets: initialMarkets,
      marketPublications: {
        [primaryMarketCode]: {
          status: "active",
          isPrimary: true,
          currency: primaryCurrency,
        },
      },
      taxonomyNodeId: "",
      listingIntent: "SELL",
      title: "",
      description: "",
      condition: "very_good",
      attributes: {},
      photos: [],
      pricing: {
        priceModel: "fixed",
        amount: 0,
        currency: primaryCurrency,
        isNegotiable: false,
        isFreeDonation: false,
      },
      transaction: {
        allowContact: true,
        allowDirectPurchase: true,
        allowReservation: true,
      },
      fulfillment: {
        allowHandDelivery: true,
        allowParcelShipping: false,
        allowBulkyDelivery: true,
        allowSellerDelivery: false,
        allowStorePickup: false,
        packageSpecs: { sizeTier: "medium" },
      },
      proInventory: {
        stock: 1,
        sku: "",
      },
      location: {
        city: currentUser?.city || "",
        postalCode: currentUser?.postalCode || "",
        countryCode: primaryMarketCode,
        hideExactAddress: true,
      },
      currentStep: 1,
      updatedAt: new Date().toISOString(),
    };
  });

  useEffect(() => {
    if (publicationStarted.current) return;
    publicationStarted.current = true;
    analyticsService.track("publication_started", {
      selectedMarketCodes: draft.selectedMarkets,
      source: "publish_wizard",
    });
    // A mount represents one publication attempt; draft mutations must not
    // create a second start event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;
    if (!currentUser?.id) {
      setIsDraftHydrated(true);
      return () => {
        active = false;
      };
    }
    services.listings
      .getListingDraft()
      .then((saved) => {
        if (active && saved) setDraft(saved);
      })
      .catch(() => {
        if (active)
          toast.error("Le brouillon enregistré n’a pas pu être chargé.");
      })
      .finally(() => {
        if (active) setIsDraftHydrated(true);
      });
    return () => {
      active = false;
    };
  }, [currentUser?.id]);

  // Autosave Draft through the selected adapter.
  useEffect(() => {
    if (!isDraftHydrated || !currentUser?.id) return;
    const timeout = window.setTimeout(() => {
      services.listings.saveListingDraft(draft).catch(() => {
        toast.error("Le brouillon n’a pas pu être sauvegardé.");
      });
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [draft, currentUser?.id, isDraftHydrated]);

  useEffect(() => {
    let active = true;
    setVisibilityOffersState("loading");
    services.promotions
      .getAvailableBoosts()
      .then((offers) => {
        if (!active) return;
        setVisibilityOffers(offers);
        setVisibilityOffersState("ready");
      })
      .catch(() => {
        if (!active) return;
        setVisibilityOffers([]);
        setVisibilityOffersState("error");
      });
    return () => {
      active = false;
    };
  }, []);

  const updateDraft = (updates: Partial<PublicationDraftState>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  };

  const updateAttribute = (attrCode: string, value: any) => {
    setDraft((prev) => ({
      ...prev,
      attributes: {
        ...(prev.attributes || {}),
        [attrCode]: value,
      },
    }));
  };

  // Compile Schema dynamically
  const schema = useMemo(() => {
    return publicationResolver.resolve({
      taxonomyNodeId: draft.taxonomyNodeId,
      marketCode: draft.marketCode,
      sellerRole: currentUser?.role,
      listingIntent: draft.listingIntent,
      currentValues: draft.attributes,
    });
  }, [
    draft.taxonomyNodeId,
    draft.marketCode,
    currentUser?.role,
    draft.listingIntent,
    draft.attributes,
  ]);

  useEffect(() => {
    if (!schema) return;
    setDraft((current) => {
      const listingIntent = schema.supportedIntents.includes(
        current.listingIntent,
      )
        ? current.listingIntent
        : schema.defaultIntent;
      const priceModel = schema.supportedPriceModels.includes(
        current.pricing.priceModel,
      )
        ? current.pricing.priceModel
        : schema.defaultPriceModel;
      if (
        listingIntent === current.listingIntent &&
        priceModel === current.pricing.priceModel &&
        current.listingFamily === schema.listingFamily
      ) {
        return current;
      }
      return {
        ...current,
        listingIntent,
        listingFamily: schema.listingFamily,
        pricing: {
          ...current.pricing,
          priceModel,
          amount: priceModel === "on_request" ? 0 : current.pricing.amount,
          isFreeDonation: priceModel === "free",
          isNegotiable: priceModel === "negotiable",
        },
      };
    });
  }, [schema]);

  const resolveSelectableNodeId = (nodeId: string): string => {
    if (taxonomyService.isPublishable(nodeId)) return nodeId;
    return (
      taxonomyService
        .getDescendants(nodeId)
        .find((candidate) => taxonomyService.isPublishable(candidate.id))?.id ||
      nodeId
    );
  };

  const minimumPhotoCount = schema?.mediaGuidance?.minimumPhotoCount ?? 1;
  const maximumPhotoCount = schema?.mediaGuidance?.maxPhotoCount ?? 8;
  const isProductLike =
    schema?.listingFamily === "physical_product" ||
    schema?.listingFamily === "vehicle" ||
    schema?.listingFamily === "professional_equipment";

  // Resolve Transaction & Fulfillment capabilities
  const transactionCaps = useMemo(() => {
    return transactionCapabilitiesService.resolve({
      taxonomyNodeId: draft.taxonomyNodeId,
      marketCode: draft.marketCode,
      sellerType: currentUser?.role === "pro_seller" ? "pro" : "individual",
      listingIntent: draft.listingIntent,
      price: draft.pricing.amount,
      stock: draft.proInventory?.stock,
    });
  }, [
    draft.taxonomyNodeId,
    draft.marketCode,
    currentUser?.role,
    draft.listingIntent,
    draft.pricing.amount,
    draft.proInventory?.stock,
  ]);

  const fulfillmentCaps = useMemo(() => {
    return fulfillmentResolver.resolveCapabilities({
      taxonomyNodeId: draft.taxonomyNodeId,
      marketCode: draft.marketCode,
      sellerType: currentUser?.role === "pro_seller" ? "pro" : "individual",
      price: draft.pricing.amount,
    });
  }, [
    draft.taxonomyNodeId,
    draft.marketCode,
    currentUser?.role,
    draft.pricing.amount,
  ]);

  // Category Search Results
  const categorySearchResults = useMemo(() => {
    if (!categorySearchQuery.trim()) return null;
    return taxonomyService.searchTaxonomy(categorySearchQuery, 8);
  }, [categorySearchQuery]);

  // Media Handlers
  const handleAddPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const available = Math.max(0, maximumPhotoCount - draft.photos.length);
    const selected = Array.from(files).slice(0, available);
    setIsUploadingPhoto(true);
    try {
      const uploaded = await Promise.all(
        selected.map((file) => services.listings.uploadListingPhoto(file)),
      );
      updateDraft({
        photos: [
          ...draft.photos,
          ...uploaded.map((asset, index) => ({
            id: asset.assetId,
            url: asset.url,
            isCover: draft.photos.length === 0 && index === 0,
            alt: `Photo ${draft.photos.length + index + 1}`,
          })),
        ],
      });
      toast.success(
        `${uploaded.length} photo${uploaded.length > 1 ? "s" : ""} ajoutée${uploaded.length > 1 ? "s" : ""}.`,
      );
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "Le téléversement de la photo a échoué.",
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    const remaining = draft.photos.filter((p) => p.id !== photoId);
    if (remaining.length > 0 && !remaining.some((p) => p.isCover)) {
      remaining[0].isCover = true;
    }
    updateDraft({ photos: remaining });
  };

  const handleSetCoverPhoto = (photoId: string) => {
    const updated = draft.photos.map((p) => ({
      ...p,
      isCover: p.id === photoId,
    }));
    updateDraft({ photos: updated });
    toast.success("Photo de couverture mise à jour.");
  };

  // AI Assistant
  const handleGenerateWithAI = async () => {
    const promptToUse = aiPromptKeyword.trim() || draft.title.trim();
    if (!promptToUse) {
      toast.error(
        "Veuillez renseigner un mot-clé ou titre d'article pour lancer l'assistant IA.",
      );
      return;
    }

    setIsGeneratingWithAI(true);
    try {
      const result: ListingAssistanceResult =
        await services.ai.generateListingAssistance({
          rawInput: promptToUse,
          condition: draft.condition as any,
          categoryHint: schema?.node
            ? getTaxonomyLabel(schema.node, "compact")
            : undefined,
          existingTitle: draft.title,
          existingPrice: draft.pricing.amount,
        });

      updateDraft({
        title: result.title,
        description: result.description,
        pricing: {
          ...draft.pricing,
          amount:
            draft.pricing.amount > 0
              ? draft.pricing.amount
              : result.estimatedPrice.recommended,
        },
      });

      if (result.tips) {
        setAiGeneratedTips(result.tips);
      }

      toast.success(
        "Annonce optimisée avec succès grâce à Gemini !",
        "Rédaction IA",
      );
    } catch {
      toast.error("Une erreur est survenue lors de la génération IA.");
    } finally {
      setIsGeneratingWithAI(false);
    }
  };

  /** Is this legacy step panel part of the phase currently on screen? */
  const showsPanel = (panel: number) =>
    Boolean(PHASES[currentStep - 1]?.panels.includes(panel));

  /* Phase validation. Requirements are unchanged — they are just enforced once
     per phase now instead of once per screen.

     This is a pure function rather than inline checks because the stepper needs
     the same answer: it used to call `setCurrentStep` directly, so clicking
     "3 Remise & livraison" on an empty draft jumped straight to the publish
     button and marked the two skipped phases done. */
  const getPhaseError = (phase: number): string | null => {
    if (phase === 1) {
      if (!draft.taxonomyNodeId)
        return "Veuillez sélectionner une catégorie finale pour continuer.";
      if (draft.photos.length < minimumPhotoCount)
        return `Veuillez ajouter au moins ${minimumPhotoCount} photo${minimumPhotoCount > 1 ? "s" : ""} pour cette catégorie.`;
    } else if (phase === 2) {
      if (!draft.title.trim())
        return "Veuillez renseigner un titre pour votre annonce.";
      if (!draft.description.trim())
        return "Veuillez renseigner une description détaillée.";
    }
    return null;
  };

  const isPhaseComplete = (phase: number) => getPhaseError(phase) === null;

  /** Every phase before `target` has to be satisfied before it can be opened. */
  const firstBlockingPhase = (target: number): number | null => {
    for (let phase = 1; phase < target; phase += 1) {
      if (!isPhaseComplete(phase)) return phase;
    }
    return null;
  };

  const goToPhase = (target: number) => {
    // Backwards is always allowed — people need to revise what they entered.
    if (target < currentStep) {
      setCurrentStep(target);
      scrollToTop();
      return;
    }
    if (target === currentStep) return;

    const blocking = firstBlockingPhase(target);
    if (blocking !== null) {
      toast.error(getPhaseError(blocking) as string);
      setCurrentStep(blocking);
      scrollToTop();
      return;
    }

    setCurrentStep(target);
    scrollToTop();
  };

  const handleNextStep = () => {
    const error = getPhaseError(currentStep);
    if (error) {
      toast.error(error);
      return;
    }

    analyticsService.track("publication_step_completed", {
      step: PHASES[currentStep - 1]?.label,
      stepIndex: currentStep,
      selectedMarketCodes: draft.selectedMarkets,
    });
    setCurrentStep((prev) => Math.min(prev + 1, PHASES.length));
    scrollToTop();
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    scrollToTop();
  };

  // Final Publish Handler
  const handleFinalPublish = async () => {
    const validation = publicationService.validateDraft(draft, currentUser);
    if (!validation.isValid) {
      toast.error(
        validation.errors[0]?.message ||
          "Veuillez corriger les erreurs avant de publier.",
      );
      return;
    }

    if (!currentUser) {
      toast.info(
        "Créez un compte léger pour conserver votre brouillon et publier.",
      );
      navigate("/connexion?redirect=%2Fdeposer");
      return;
    }

    setIsPublishing(true);
    try {
      const actions = [
        currentUser.accountType === "professional"
          ? "publish_professional_listing"
          : "publish_listing",
        ...(draft.transaction.allowDirectPurchase
          ? (["accept_online_payment"] as const)
          : []),
      ] as const;
      for (const requestedAction of actions) {
        const requirement =
          await services.verification.getVerificationRequirements(
            currentUser.id,
            {
              requestedAction,
              jurisdiction: draft.location.countryCode || defaultMarketCode,
              marketCode: draft.marketCode,
              categoryId: draft.taxonomyNodeId,
              transactionContext: draft.transaction.allowDirectPurchase
                ? {
                    transactionType: "direct_purchase",
                    contractConclusionMode: "platform",
                    paymentFlow: "psp_marketplace",
                    amountMinor: Math.round(draft.pricing.amount * 100),
                    currency: draft.pricing.currency,
                  }
                : {
                    transactionType: "classified",
                    contractConclusionMode: "off_platform",
                    paymentFlow: "none",
                  },
            },
          );
        if (!requirement.allowed) {
          toast.info(
            "Votre brouillon est conservé. Complétez uniquement la vérification nécessaire pour continuer.",
          );
          navigate(
            `/compte/verification?action=${requestedAction}&returnTo=${encodeURIComponent("/deposer")}`,
          );
          return;
        }
      }

      const published = await services.listings.publishListing(
        draft,
        currentUser.id,
      );
      analyticsService.track("publication_completed", {
        listingId: published.id,
        categoryId: draft.taxonomyNodeId,
        selectedMarketCodes: draft.selectedMarkets,
      });
      toast.success(
        published.status === "active"
          ? "Votre annonce est publiée."
          : "Votre annonce a été enregistrée et doit être examinée.",
      );
      navigate(`/annonce/${published.id}`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la publication.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-primary uppercase tracking-wider block">
            {t("publishing.publishWizard.votreAnnonce")}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            {t("publishing.publishWizard.deposerUneAnnonceSurShongre")}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="neutral" size="sm">
            Étape {currentStep} / {PHASES.length}
          </Badge>
          <span className="text-xs text-stone-500 hidden sm:inline">
            {t("publishing.publishWizard.brouillonAutoSauvegarde")}
          </span>
        </div>
      </div>

      {/* Progress.
          Three phases fit a rail at every width, so the phone no longer needs a
          separate compact treatment — it gets the same rail with the hint text
          dropped. */}
      <div className="bg-white p-3 rounded-2xl border border-border-base shadow-xs space-y-2.5">
        <ProgressBar
          value={currentStep}
          max={PHASES.length}
          label={`Progression de la publication : étape ${currentStep} sur ${PHASES.length}`}
        />

        <ol className="grid grid-cols-3 gap-1.5 text-xs">
          {PHASES.map((p) => {
            const isCurrent = currentStep === p.id;
            /* Derived from the draft, not from `currentStep > p.id`: the index
               comparison claimed a phase was finished simply because the user
               had moved past it. */
            const isDone =
              !isCurrent && p.id < currentStep && isPhaseComplete(p.id);
            const isLocked =
              p.id > currentStep && firstBlockingPhase(p.id) !== null;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => goToPhase(p.id)}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-disabled={isLocked || undefined}
                  className={`w-full text-left flex items-start gap-2 px-2.5 py-2 rounded-xl font-bold transition-colors cursor-pointer ${
                    isCurrent
                      ? "bg-primary-light text-primary ring-1 ring-primary"
                      : isDone
                        ? "text-success hover:bg-stone-50"
                        : isLocked
                          ? "text-stone-400"
                          : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-micro font-black shrink-0 mt-px ${
                      isCurrent
                        ? "bg-primary text-white"
                        : isDone
                          ? "bg-success text-white"
                          : "bg-stone-200 text-stone-700"
                    }`}
                  >
                    {isDone ? "✓" : p.id}
                  </span>
                  <span className="min-w-0">
                    <span className="block leading-tight">{p.label}</span>
                    <span className="hidden sm:block font-medium text-micro text-stone-500 leading-tight mt-0.5">
                      {p.hint}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: CATEGORY & INTENT SELECTION */}
      {/* ========================================================================= */}
      {showsPanel(1) && (
        <div className="bg-white rounded-2xl border border-border-base p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">
              {t("publishing.publishWizard.queSouhaitezVousPublier")}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              {t("publishing.publishWizard.selectionnezLIntentionEtLa")}
            </p>
          </div>

          {/* Listing Intent Selector */}
          <div>
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2">
              {t("publishing.publishWizard.typeDAnnonceIntention")}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                {
                  value: "SELL",
                  label: "Vendre un bien",
                  desc: "Vente standard",
                  Icon: Tag,
                },
                {
                  value: "GIVE",
                  label: "Faire un don",
                  desc: `Gratuit (0 ${currencySymbol})`,
                  Icon: Gift,
                },
                {
                  value: "EXCHANGE",
                  label: "Échange de biens",
                  desc: "Troc / Échange",
                  Icon: ArrowLeftRight,
                },
                {
                  value: "RENT",
                  label: "Location",
                  desc: "Louer un bien",
                  Icon: KeyRound,
                },
                {
                  value: "OFFER_SERVICE",
                  label: "Proposer un service",
                  desc: "Artisan, cours, presta",
                  Icon: Wrench,
                },
                {
                  value: "JOB_OFFER",
                  label: "Offre d'emploi",
                  desc: "Recrutement",
                  Icon: Briefcase,
                },
              ].map((it) => (
                <button
                  key={it.value}
                  type="button"
                  onClick={() =>
                    updateDraft({ listingIntent: it.value as ListingIntent })
                  }
                  aria-pressed={draft.listingIntent === it.value}
                  className={`flex min-h-control-md items-center gap-2.5 rounded-control border p-3 text-left ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer ${
                    draft.listingIntent === it.value
                      ? "border-primary bg-primary-light text-primary font-bold"
                      : "border-border-base bg-bg-surface text-text-main hover:bg-bg-subtle"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-control ${
                      draft.listingIntent === it.value
                        ? "bg-primary text-white"
                        : "bg-primary-light text-primary"
                    }`}
                  >
                    <it.Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold">
                      {it.label}
                    </span>
                    <span className="mt-0.5 block truncate text-micro text-stone-500">
                      {it.desc}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Taxonomy Search */}
          <div className="pt-4 border-t border-border-subtle space-y-3">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              {t("publishing.publishWizard.rechercherUneCategorieOuUn")}
            </label>
            <div className="relative">
              <Search className="w-icon-md h-icon-md text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder={t("publishing.publishWizard.exCanapeDAngleIphone")}
                aria-label={t(
                  "publishing.publishWizard.rechercherUneCategorie",
                )}
                value={categorySearchQuery}
                onChange={(e) => setCategorySearchQuery(e.target.value)}
                className="w-full h-control-md pl-9 pr-3 bg-bg-base text-xs text-stone-900 rounded-control border border-border-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-medium"
              />
            </div>

            {categorySearchResults && (
              <div className="p-2 border border-border-base rounded-xl divide-y divide-border-subtle bg-bg-base/40 text-xs">
                {categorySearchResults.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      updateDraft({
                        taxonomyNodeId: resolveSelectableNodeId(n.id),
                      });
                      setCategorySearchQuery("");
                    }}
                    className="w-full p-2.5 text-left hover:bg-white flex items-center justify-between transition-colors rounded-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <CategoryIcon category={n} size="sm" />
                      <div>
                        <div className="font-bold text-stone-900">
                          {getTaxonomyLabel(n, "compact")}
                        </div>
                        <div className="text-micro text-stone-500">
                          {taxonomyService
                            .getBreadcrumbs(n.id, "compact")
                            .map((b) => b.label)
                            .join(" › ")}
                        </div>
                      </div>
                    </div>
                    {draft.taxonomyNodeId === n.id && (
                      <Check className="w-icon-md h-icon-md text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Root Categories Grid */}
          <div className="pt-4 border-t border-border-subtle space-y-3">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              {t("publishing.publishWizard.ouParcourezLesUnivers")}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto p-1">
              {taxonomyService.getRootCategories().map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    updateDraft({
                      taxonomyNodeId: resolveSelectableNodeId(cat.id),
                    });
                  }}
                  title={getTaxonomyLabel(cat, "compact")}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                    schema?.ancestors[0]?.id === cat.id ||
                    draft.taxonomyNodeId === cat.id
                      ? "border-primary bg-primary-light text-primary font-bold shadow-xs"
                      : "border-border-base bg-white hover:bg-stone-50 text-stone-800"
                  }`}
                >
                  <CategoryIcon category={cat} size="md" />
                  <span className="text-xs font-bold line-clamp-1">
                    {getTaxonomyLabel(cat, "compact")}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Current Selected Breadcrumb Path */}
          {schema && (
            <div className="p-3.5 bg-success-surface text-success rounded-xl border border-success-border text-xs flex items-center justify-between">
              <div>
                <span className="font-bold block mb-0.5">
                  {t("publishing.publishWizard.categorieActiveValidee")}
                </span>
                <span className="font-mono text-success">
                  {taxonomyService
                    .getBreadcrumbs(schema.node.id, "compact")
                    .map((b) => b.label)
                    .join(" › ")}
                </span>
              </div>
              <CheckCircle2 className="w-icon-lg h-icon-lg text-success shrink-0" />
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: CHARACTERISTICS & DYNAMIC ATTRIBUTES */}
      {/* ========================================================================= */}
      {showsPanel(2) && (
        <div className="bg-white rounded-2xl border border-border-base p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            {/* The category name is only known once one is chosen. Now that this
                panel shares a page with the category picker it can render before
                that, so the suffix is conditional rather than "(  )". */}
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">
              Caractéristiques techniques
              {schema?.node
                ? ` · ${getTaxonomyLabel(schema.node, "compact")}`
                : ""}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              {schema?.node
                ? schema.listingFamily === "job"
                  ? "Précisez la disponibilité du poste et les critères utiles aux candidats."
                  : schema.listingFamily === "service"
                    ? "Précisez la disponibilité de la prestation et les critères utiles aux clients."
                    : "Renseignez l'état du bien et les critères spécifiques pour optimiser la recherche."
                : "Choisissez une catégorie ci-dessus pour voir les critères correspondants."}
            </p>
          </div>

          {/* Condition Scheme Selector */}
          <div>
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2">
              {schema?.listingFamily === "job"
                ? "Disponibilité du poste"
                : schema?.listingFamily === "service"
                  ? "Disponibilité de la prestation"
                  : t("publishing.publishWizard.etatDuBienProduit")}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(schema?.conditionScheme || []).map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => updateDraft({ condition: c.value })}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    draft.condition === c.value
                      ? "border-primary bg-primary-light text-primary font-bold ring-1 ring-primary"
                      : "border-border-base bg-white hover:bg-stone-50 text-stone-800"
                  }`}
                >
                  <div className="text-xs font-bold">{c.label}</div>
                  <div className="text-micro text-stone-500 mt-0.5">
                    {c.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Attributes Grid */}
          {schema && schema.fields.length > 0 && (
            <div className="pt-4 border-t border-border-subtle space-y-4">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-icon-sm h-icon-sm text-primary" />
                <span>{t("publishing.publishWizard.criteresDetailles")}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {schema.fields.map((field) => {
                  if (!field.isVisiblyMet) return null;
                  const attr = field.attribute;
                  const value = draft.attributes?.[attr.code] ?? "";
                  const hint =
                    attr.helpText ||
                    (field.fieldRole === "recommended"
                      ? "Champ recommandé"
                      : undefined);

                  if (attr.dataType === "select") {
                    return (
                      <FormField
                        key={attr.id}
                        label={attr.label}
                        required={field.isRequired}
                        hint={hint}
                      >
                        <Select
                          size="compact"
                          className="w-full"
                          labelledByAncestor
                          value={value}
                          onChange={(e) =>
                            updateAttribute(attr.code, e.target.value)
                          }
                        >
                          <option value="">
                            {t(
                              "publishing.publishWizard.selectionnerUneOption",
                            )}
                          </option>
                          {attr.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                    );
                  }

                  if (attr.dataType === "multi_select") {
                    const selectedValues = Array.isArray(value) ? value : [];
                    return (
                      <FormField
                        key={attr.id}
                        label={attr.label}
                        required={field.isRequired}
                        hint={hint}
                      >
                        <div className="grid grid-cols-1 gap-2 rounded-control border border-border-base bg-bg-base p-3 sm:grid-cols-2">
                          {(attr.options || []).map((option) => (
                            <Checkbox
                              key={option.value}
                              label={option.label}
                              checked={selectedValues.includes(option.value)}
                              onChange={(event) => {
                                const next = event.target.checked
                                  ? [...selectedValues, option.value]
                                  : selectedValues.filter(
                                      (selected) => selected !== option.value,
                                    );
                                updateAttribute(attr.code, next);
                              }}
                            />
                          ))}
                        </div>
                      </FormField>
                    );
                  }

                  if (
                    attr.dataType === "number" ||
                    attr.dataType === "year" ||
                    attr.dataType === "money"
                  ) {
                    return (
                      <FormField
                        key={attr.id}
                        label={`${attr.label} ${attr.unit ? `(${attr.unit})` : ""}`}
                        required={field.isRequired}
                        hint={hint}
                      >
                        <Input
                          type="number"
                          placeholder={
                            attr.validation?.placeholder ||
                            (attr.unit ? `ex: 50 ${attr.unit}` : "")
                          }
                          value={value}
                          min={attr.validation?.min}
                          max={attr.validation?.max}
                          step={
                            attr.validation?.step ||
                            (attr.dataType === "year" ? 1 : undefined)
                          }
                          onChange={(e) =>
                            updateAttribute(
                              attr.code,
                              e.target.value ? Number(e.target.value) : "",
                            )
                          }
                          className="h-control-md text-xs"
                        />
                      </FormField>
                    );
                  }

                  if (attr.dataType === "range") {
                    const rangeValue =
                      value &&
                      typeof value === "object" &&
                      !Array.isArray(value)
                        ? value
                        : { min: "", max: "" };
                    return (
                      <FormField
                        key={attr.id}
                        label={`${attr.label} ${attr.unit ? `(${attr.unit})` : ""}`}
                        required={field.isRequired}
                        hint={hint}
                      >
                        <div className="grid grid-cols-2 gap-2">
                          {(["min", "max"] as const).map((bound) => (
                            <Input
                              key={bound}
                              type="number"
                              aria-label={
                                bound === "min" ? "Minimum" : "Maximum"
                              }
                              placeholder={bound === "min" ? "Min" : "Max"}
                              value={rangeValue[bound] ?? ""}
                              min={attr.validation?.min}
                              max={attr.validation?.max}
                              step={attr.validation?.step}
                              onChange={(event) =>
                                updateAttribute(attr.code, {
                                  ...rangeValue,
                                  [bound]: event.target.value
                                    ? Number(event.target.value)
                                    : "",
                                })
                              }
                              className="h-control-md text-xs"
                            />
                          ))}
                        </div>
                      </FormField>
                    );
                  }

                  if (attr.dataType === "boolean") {
                    return (
                      <div key={attr.id} className="flex items-center pt-6">
                        <Checkbox
                          label={attr.label}
                          description={attr.helpText}
                          checked={!!value}
                          onChange={(e) =>
                            updateAttribute(attr.code, e.target.checked)
                          }
                        />
                      </div>
                    );
                  }

                  if (attr.dataType === "long_text") {
                    return (
                      <FormField
                        key={attr.id}
                        label={attr.label}
                        required={field.isRequired}
                        hint={hint}
                      >
                        <Textarea
                          value={value}
                          maxLength={attr.validation?.maxLength}
                          placeholder={attr.validation?.placeholder || ""}
                          onChange={(event) =>
                            updateAttribute(attr.code, event.target.value)
                          }
                          className="min-h-24 text-xs"
                        />
                      </FormField>
                    );
                  }

                  if (
                    attr.dataType === "date" ||
                    attr.dataType === "date_time"
                  ) {
                    return (
                      <FormField
                        key={attr.id}
                        label={attr.label}
                        required={field.isRequired}
                        hint={hint}
                      >
                        <Input
                          type={
                            attr.dataType === "date" ? "date" : "datetime-local"
                          }
                          value={value}
                          onChange={(event) =>
                            updateAttribute(attr.code, event.target.value)
                          }
                          className="h-control-md text-xs"
                        />
                      </FormField>
                    );
                  }

                  return (
                    <FormField
                      key={attr.id}
                      label={attr.label}
                      required={field.isRequired}
                      hint={hint}
                    >
                      <Input
                        type="text"
                        placeholder={attr.validation?.placeholder || ""}
                        value={value}
                        onChange={(e) =>
                          updateAttribute(attr.code, e.target.value)
                        }
                        className="h-control-md text-xs"
                      />
                    </FormField>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: PHOTOS & MEDIA */}
      {/* ========================================================================= */}
      {showsPanel(3) && (
        <div className="bg-white rounded-2xl border border-border-base p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">
              {t("publishing.publishWizard.photosDeVotreAnnonce")}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              {minimumPhotoCount > 0
                ? `${minimumPhotoCount} photo${minimumPhotoCount > 1 ? "s" : ""} minimum · ${maximumPhotoCount} maximum pour cette catégorie.`
                : `Média facultatif · ${maximumPhotoCount} maximum pour cette catégorie.`}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {draft.photos.map((photo, index) => (
              <div
                key={photo.id}
                className="group relative aspect-square rounded-xl overflow-hidden border-2 border-border-base bg-bg-base"
              >
                <Image
                  src={photo.url}
                  alt={photo.alt ?? ""}
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="w-full h-full object-cover"
                />

                {/* The scrim stays a hover/focus affordance — it is what tells a
                    mouse user the tile is interactive — but it must not be the
                    thing that reveals the controls. Gating both on `:hover` meant
                    a phone, which has no hover, could neither delete a photo nor
                    choose a cover: the only controls for either action were
                    permanently at `opacity-0`. Keyboard users had the mirror
                    problem — Tab moved focus onto buttons they could not see. */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-fast pointer-events-none"
                />
                <div className="absolute inset-0 flex flex-col justify-between p-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100 transition-opacity duration-fast">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo.id)}
                      aria-label={`Supprimer la photo ${index + 1}`}
                      className="w-7 h-7 inline-flex items-center justify-center bg-danger text-white rounded-md shadow-xs hover:bg-danger-hover active:bg-danger-active transition-colors duration-fast cursor-pointer"
                    >
                      <Trash2 className="w-icon-md h-icon-md" />
                    </button>
                  </div>
                  <div>
                    {!photo.isCover && (
                      <button
                        type="button"
                        onClick={() => handleSetCoverPhoto(photo.id)}
                        className="w-full min-h-6 py-1.5 bg-white/95 text-stone-900 text-micro font-bold rounded shadow-xs hover:bg-white active:bg-bg-subtle transition-colors duration-fast cursor-pointer"
                      >
                        Mettre en couverture
                      </button>
                    )}
                  </div>
                </div>
                {photo.isCover && (
                  <div className="absolute top-2 left-2 bg-primary text-white text-micro font-bold px-1.5 py-0.5 rounded shadow-xs">
                    Couverture
                  </div>
                )}
              </div>
            ))}

            {draft.photos.length < maximumPhotoCount && (
              <label className="aspect-square rounded-xl border-2 border-dashed border-border-base hover:border-primary bg-bg-base flex flex-col items-center justify-center gap-1.5 text-stone-500 hover:text-primary transition-colors cursor-pointer p-4 focus-within:ring-2 focus-within:ring-primary/30">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  disabled={isUploadingPhoto}
                  onChange={(event) => {
                    void handleAddPhotos(event.target.files);
                    event.target.value = "";
                  }}
                />
                <Camera className="w-icon-xl h-icon-xl text-stone-400" />
                <span className="text-xs font-bold">
                  {isUploadingPhoto ? "Téléversement…" : "+ Ajouter photo"}
                </span>
                <span className="text-micro text-stone-500">
                  JPEG, PNG ou WebP · 10 Mo max
                </span>
              </label>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: TITLE, DESCRIPTION & AI */}
      {/* ========================================================================= */}
      {showsPanel(4) && (
        <div className="bg-white rounded-2xl border border-border-base p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">
              {t("publishing.publishWizard.titreDescriptionDetaillee")}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              {t("publishing.publishWizard.redigezUnTitreClairOu")}
            </p>
          </div>

          {/* AI GEMINI ASSISTANT */}
          <div className="p-4 bg-gradient-to-r from-primary-light via-orange-50/70 to-amber-50/80 rounded-2xl border border-primary-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-icon-md h-icon-md" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider">
                    {t("publishing.publishWizard.assistantIaRedactionGemini")}
                  </h3>
                  <p className="text-micro text-stone-500">
                    {t(
                      "publishing.publishWizard.generezUneDescriptionOptimiseePour",
                    )}
                  </p>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleGenerateWithAI}
                isLoading={isGeneratingWithAI}
                leftIcon={<Bot className="w-icon-sm h-icon-sm" />}
              >
                {t("publishing.publishWizard.genererAvecLIa")}
              </Button>
            </div>
          </div>

          <FormField
            label={t("publishing.publishWizard.titreDeLAnnonce")}
            required
            hint="Indiquez le produit, la marque et le modèle précis"
          >
            <Input
              placeholder={t(
                "publishing.publishWizard.exCanapeScandinave3Places",
              )}
              value={draft.title}
              onChange={(e) => updateDraft({ title: e.target.value })}
            />
          </FormField>

          <FormField
            label={t("publishing.publishWizard.descriptionDetaillee")}
            required
            hint="Précisez l'état, l'historique d'achat, les accessoires inclus"
          >
            <Textarea
              rows={6}
              placeholder={t(
                "publishing.publishWizard.vendsCanapeEnExcellentEtat",
              )}
              value={draft.description}
              onChange={(e) => updateDraft({ description: e.target.value })}
            />
          </FormField>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: PRICING & STOCK */}
      {/* ========================================================================= */}
      {showsPanel(5) && (
        <div className="bg-white rounded-2xl border border-border-base p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">
              {schema?.listingFamily === "job"
                ? "Rémunération"
                : schema?.listingFamily === "service"
                  ? "Tarification de la prestation"
                  : schema?.listingFamily === "real_estate"
                    ? "Prix ou loyer"
                    : t("publishing.publishWizard.prixDeVenteStock")}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              {schema?.listingFamily === "job"
                ? "Indiquez une fourchette ou choisissez de communiquer la rémunération sur demande."
                : `Définissez votre tarification en ${schema?.currency.symbol || currencySymbol}.`}
            </p>
          </div>

          <div className="space-y-4">
            {schema && schema.supportedPriceModels.length > 1 && (
              <FormField label="Mode de tarification" required>
                <Select
                  size="compact"
                  className="w-full"
                  labelledByAncestor
                  value={draft.pricing.priceModel}
                  onChange={(event) => {
                    const priceModel = event.target.value as PriceModel;
                    updateDraft({
                      pricing: {
                        ...draft.pricing,
                        priceModel,
                        amount:
                          priceModel === "on_request" || priceModel === "free"
                            ? 0
                            : draft.pricing.amount,
                        isFreeDonation: priceModel === "free",
                        isNegotiable: priceModel === "negotiable",
                      },
                    });
                  }}
                >
                  {schema.supportedPriceModels.map((model) => (
                    <option key={model} value={model}>
                      {PRICE_MODEL_LABELS[model]}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}

            {draft.pricing.priceModel !== "free" &&
              draft.pricing.priceModel !== "on_request" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    label={`${PRICE_MODEL_LABELS[draft.pricing.priceModel]} (${schema?.currency.symbol || currencySymbol})`}
                    required
                  >
                    <Input
                      type="number"
                      placeholder="ex: 150"
                      value={draft.pricing.amount || ""}
                      onChange={(e) =>
                        updateDraft({
                          pricing: {
                            ...draft.pricing,
                            amount: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </FormField>

                  {isProductLike && (
                    <div className="flex items-center pt-6">
                      <Checkbox
                        label={t("publishing.publishWizard.prixNegociable")}
                        description={t(
                          "publishing.publishWizard.permetAuxAcheteursDeFaire",
                        )}
                        checked={draft.pricing.isNegotiable}
                        onChange={(e) =>
                          updateDraft({
                            pricing: {
                              ...draft.pricing,
                              isNegotiable: e.target.checked,
                            },
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              )}

            {/* Pro Inventory section if Pro Seller */}
            {currentUser?.role === "pro_seller" && isProductLike && (
              <div className="pt-4 border-t border-border-subtle space-y-3">
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Store className="w-icon-sm h-icon-sm text-primary" />
                  <span>
                    {t(
                      "publishing.publishWizard.gestionDesStocksReferenceProfessionnelle",
                    )}
                  </span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    label={t("publishing.publishWizard.quantiteEnStock")}
                  >
                    <Input
                      type="number"
                      min={PUBLICATION_CONSTRAINTS.stockQuantity.min}
                      value={
                        draft.proInventory?.stock ??
                        PUBLICATION_CONSTRAINTS.stockQuantity.min
                      }
                      onChange={(e) =>
                        updateDraft({
                          proInventory: {
                            ...draft.proInventory,
                            stock: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </FormField>
                  <FormField
                    label={t(
                      "publishing.publishWizard.referenceInterneSkuFacultatif",
                    )}
                  >
                    <Input
                      placeholder="ex: CAN-BOUC-BEIGE-01"
                      value={draft.proInventory?.sku || ""}
                      onChange={(e) =>
                        updateDraft({
                          proInventory: {
                            ...draft.proInventory,
                            stock: draft.proInventory?.stock ?? 1,
                            sku: e.target.value,
                          },
                        })
                      }
                    />
                  </FormField>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 6: TRANSACTIONS & MODES */}
      {/* ========================================================================= */}
      {showsPanel(6) && (
        <div className="bg-white rounded-2xl border border-border-base p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">
              {t("publishing.publishWizard.commentSouhaitezVousVendre")}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              {t("publishing.publishWizard.activezLesOptionsDeTransaction")}
            </p>
          </div>

          <div className="space-y-3">
            {/* Contact Direct */}
            <div className="p-4 rounded-xl border border-border-base bg-bg-base/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
                  <Bot className="w-icon-md h-icon-md" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">
                    Contact direct & Messagerie
                  </div>
                  <div className="text-micro text-stone-500">
                    {t("publishing.publishWizard.lesAcheteursPeuventVousPoser")}
                  </div>
                </div>
              </div>
              <Checkbox
                aria-label={t(
                  "publishing.publishWizard.autoriserLeContactDirectEt",
                )}
                checked={draft.transaction.allowContact}
                onChange={(e) =>
                  updateDraft({
                    transaction: {
                      ...draft.transaction,
                      allowContact: e.target.checked,
                    },
                  })
                }
              />
            </div>

            {/* Direct Online Purchase */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                transactionCaps.canDirectPurchase
                  ? "border-border-base bg-bg-base/40"
                  : "border-stone-200 bg-stone-50 opacity-60"
              } flex items-center justify-between`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-success-surface text-success flex items-center justify-center">
                  <ShieldCheck className="w-icon-md h-icon-md" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900 flex items-center gap-2">
                    <span>
                      {t("publishing.publishWizard.achatEnLigneDirectSans")}
                    </span>
                    <span className="text-micro bg-success-surface text-success font-bold px-1.5 py-0.5 rounded">
                      {t("publishing.publishWizard.sequestreGaranti")}
                    </span>
                  </div>
                  <div className="text-micro text-stone-500">
                    {t(
                      "publishing.publishWizard.lAcheteurPeutPayerImmediatement",
                    )}
                  </div>
                </div>
              </div>
              <Checkbox
                aria-label={t(
                  "publishing.publishWizard.autoriserLePaiementSecuriseDirect",
                )}
                disabled={!transactionCaps.canDirectPurchase}
                checked={
                  draft.transaction.allowDirectPurchase &&
                  transactionCaps.canDirectPurchase
                }
                onChange={(e) =>
                  updateDraft({
                    transaction: {
                      ...draft.transaction,
                      allowDirectPurchase: e.target.checked,
                    },
                  })
                }
              />
            </div>

            {/* Reservation */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                transactionCaps.canReserve
                  ? "border-border-base bg-bg-base/40"
                  : "border-stone-200 bg-stone-50 opacity-60"
              } flex items-center justify-between`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                  <Clock className="w-icon-md h-icon-md" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">
                    {t("publishing.publishWizard.reservationAvecAcompte")}
                  </div>
                  <div className="text-micro text-stone-500">
                    {t("publishing.publishWizard.permetALAcheteurDe")}
                  </div>
                </div>
              </div>
              <Checkbox
                disabled={!transactionCaps.canReserve}
                checked={
                  draft.transaction.allowReservation &&
                  transactionCaps.canReserve
                }
                onChange={(e) =>
                  updateDraft({
                    transaction: {
                      ...draft.transaction,
                      allowReservation: e.target.checked,
                    },
                  })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 7: FULFILLMENT & SHIPPING */}
      {/* ========================================================================= */}
      {showsPanel(7) && (
        <div className="bg-white rounded-2xl border border-border-base p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">
              {t("publishing.publishWizard.modesDeRemiseExpedition")}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              {t(
                "publishing.publishWizard.determinezCommentLesAcheteursPeuvent",
              )}
            </p>
          </div>

          <div className="space-y-3">
            {/* Hand Delivery */}
            <div className="p-4 rounded-xl border border-border-base bg-bg-base/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                  <MapPin className="w-icon-md h-icon-md" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">
                    Remise en main propre
                  </div>
                  <div className="text-micro text-stone-500">
                    {t("publishing.publishWizard.gratuitAvecValidationParCode")}
                  </div>
                </div>
              </div>
              <Checkbox
                checked={draft.fulfillment.allowHandDelivery}
                onChange={(e) =>
                  updateDraft({
                    fulfillment: {
                      ...draft.fulfillment,
                      allowHandDelivery: e.target.checked,
                    },
                  })
                }
              />
            </div>

            {/* Parcel Shipping */}
            {fulfillmentCaps.allowParcelShipping && (
              <div className="p-4 rounded-xl border border-border-base bg-bg-base/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-info-surface text-info flex items-center justify-center">
                      <Package className="w-icon-md h-icon-md" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-900">
                        {t(
                          "publishing.publishWizard.livraisonEnColisMondialRelay",
                        )}
                      </div>
                      <div className="text-micro text-stone-500">
                        {t(
                          "publishing.publishWizard.etiquettePrepayeeGenereeAutomatiquementL",
                        )}
                      </div>
                    </div>
                  </div>
                  <Checkbox
                    checked={draft.fulfillment.allowParcelShipping}
                    onChange={(e) =>
                      updateDraft({
                        fulfillment: {
                          ...draft.fulfillment,
                          allowParcelShipping: e.target.checked,
                        },
                      })
                    }
                  />
                </div>

                {draft.fulfillment.allowParcelShipping && (
                  <div className="pt-3 border-t border-border-subtle">
                    <label className="text-xs font-bold text-stone-700 block mb-1.5">
                      {t("publishing.publishWizard.gabaritDuColisPoidsEstime")}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {[
                        {
                          id: "small",
                          label: "Petit (< 500g)",
                          desc: "T-shirt, smartphone",
                        },
                        {
                          id: "medium",
                          label: "Moyen (< 2kg)",
                          desc: "Chaussures, tablette",
                        },
                        {
                          id: "large",
                          label: "Grand (< 5kg)",
                          desc: "Manteau, cafetière",
                        },
                        {
                          id: "xlarge",
                          label: "Très grand (< 30kg)",
                          desc: "Ampli, petit meuble",
                        },
                      ].map((pkg) => (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() =>
                            updateDraft({
                              fulfillment: {
                                ...draft.fulfillment,
                                packageSpecs: {
                                  sizeTier: pkg.id as PackageSizeTier,
                                },
                              },
                            })
                          }
                          className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                            draft.fulfillment.packageSpecs?.sizeTier === pkg.id
                              ? "bg-stone-900 text-white font-bold"
                              : "bg-white text-stone-800 border-border-base hover:bg-stone-50"
                          }`}
                        >
                          <div className="text-xs font-bold">{pkg.label}</div>
                          <div className="text-micro opacity-70 mt-0.5">
                            {pkg.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bulky Delivery */}
            {fulfillmentCaps.allowBulkyDelivery && (
              <div className="p-4 rounded-xl border border-border-base bg-bg-base/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-warning-surface text-warning flex items-center justify-center">
                    <Truck className="w-icon-md h-icon-md" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900">
                      {t(
                        "publishing.publishWizard.transportDeMeublesGrosColis",
                      )}
                    </div>
                    <div className="text-micro text-stone-500">
                      {t(
                        "publishing.publishWizard.idealPourCanapesTablesElectromenager",
                      )}
                    </div>
                  </div>
                </div>
                <Checkbox
                  checked={draft.fulfillment.allowBulkyDelivery}
                  onChange={(e) =>
                    updateDraft({
                      fulfillment: {
                        ...draft.fulfillment,
                        allowBulkyDelivery: e.target.checked,
                      },
                    })
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 8: LOCATION & PRIVACY */}
      {/* ========================================================================= */}
      {showsPanel(8) && (
        <div className="bg-white rounded-2xl border border-border-base p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">
              {t("publishing.publishWizard.localisationDuBien")}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              {t("publishing.publishWizard.parRespectPourVotreVie")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Ville" required>
              <Input
                placeholder="ex: Paris, Lyon, Bordeaux"
                value={draft.location.city}
                onChange={(e) =>
                  updateDraft({
                    location: { ...draft.location, city: e.target.value },
                  })
                }
              />
            </FormField>

            <FormField label="Code postal" required>
              <Input
                placeholder="ex: 75011, 69002, 33000"
                value={draft.location.postalCode}
                onChange={(e) =>
                  updateDraft({
                    location: { ...draft.location, postalCode: e.target.value },
                  })
                }
              />
            </FormField>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 9: MARKETS & VISIBILITY BOOST OPTIONS */}
      {/* ========================================================================= */}
      {/* Advanced: multi-market reach. Sensible defaults are already applied from
          the seller's profile, so this is a disclosure rather than a required
          screen — most sellers publish to their home market and never open it. */}
      {showsPanel(ADVANCED_PANEL) && (
        <div className="bg-white rounded-2xl border border-border-base shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
            className="w-full flex items-center justify-between gap-3 p-5 sm:p-6 text-left hover:bg-bg-base/60 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Globe className="w-icon-lg h-icon-lg text-primary shrink-0" />
              <span className="min-w-0">
                <span className="block font-black text-stone-900">
                  {t("publishing.publishWizard.optionsAvancees")}
                </span>
                <span className="block text-xs text-stone-500 mt-0.5">
                  Diffusion multi-marchés et visibilité —{" "}
                  {plural(
                    draft.selectedMarkets?.length || 1,
                    "marché sélectionné",
                    "marchés sélectionnés",
                  )}
                </span>
              </span>
            </span>
            <ChevronRight
              className={`w-icon-lg h-icon-lg text-stone-400 shrink-0 transition-transform duration-fast ${
                showAdvanced ? "rotate-90" : ""
              }`}
            />
          </button>
        </div>
      )}
      {showsPanel(ADVANCED_PANEL) && showAdvanced && (
        <div className="space-y-6">
          {/* MULTI-MARKET SELECTION CARD */}
          <div className="bg-white rounded-2xl border border-border-base p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-subtle">
              <div>
                <div className="flex items-center gap-2">
                  <Globe className="w-icon-lg h-icon-lg text-primary" />
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900">
                    {t("publishing.publishWizard.marchesEtPaysDeDiffusion")}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-stone-500 mt-1">
                  {t(
                    "publishing.publishWizard.diffusezVotreAnnonceSimultanementSur",
                  )}
                </p>
              </div>

              {/* Bulk actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allEligible = marketService
                      .getActiveMarkets()
                      .filter((m) =>
                        marketService.isCategoryEnabledInMarket(
                          m.code,
                          schema?.node?.slug ||
                            schema?.ancestors[0]?.slug ||
                            "",
                        ),
                      )
                      .map((m) => m.code);
                    updateDraft({
                      selectedMarkets:
                        allEligible.length > 0
                          ? allEligible
                          : [defaultMarketCode],
                    });
                    toast.success(
                      "Tous les marchés éligibles ont été sélectionnés.",
                    );
                  }}
                  className="text-xs px-3 py-1.5 rounded-xl border border-primary/30 text-primary hover:bg-primary-light/50 font-bold transition-colors cursor-pointer"
                >
                  {t("publishing.publishWizard.tousLesMarches")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateDraft({ selectedMarkets: [defaultMarketCode] });
                    toast.info(
                      `Diffusion restreinte au marché ${defaultMarket.name}.`,
                    );
                  }}
                  className="text-xs px-3 py-1.5 rounded-xl border border-border-base text-stone-600 hover:bg-stone-50 font-bold transition-colors cursor-pointer"
                >
                  {defaultMarket.name} uniquement
                </button>
              </div>
            </div>

            {/* Markets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {marketService.getMarkets().map((m) => {
                const categorySlug =
                  schema?.node?.slug || schema?.ancestors[0]?.slug || "";
                const isCatEnabled = marketService.isCategoryEnabledInMarket(
                  m.code,
                  categorySlug,
                );
                const isSelected = (
                  draft.selectedMarkets || [defaultMarketCode]
                ).includes(m.code);
                const isPrimary = m.isDefault;
                const effectiveCfg = marketService.getEffectiveConfig(m.code);
                const isUnavailable = !isCatEnabled && !isSelected;

                const toggleMarket = () => {
                  if (isUnavailable) {
                    toast.error(
                      `La catégorie "${schema?.node ? getTaxonomyLabel(schema.node, "compact") : "actuelle"}" n'est pas encore ouverte sur le marché ${m.name}.`,
                    );
                    return;
                  }
                  if (isPrimary && isSelected) {
                    toast.info(
                      `Le marché ${defaultMarket.name} est le marché de référence obligatoire pour cette annonce.`,
                    );
                    return;
                  }

                  const currentSelected = draft.selectedMarkets || [
                    defaultMarketCode,
                  ];
                  const next = isSelected
                    ? currentSelected.filter((c) => c !== m.code)
                    : [...currentSelected, m.code];

                  updateDraft({
                    selectedMarkets:
                      next.length === 0 ? [defaultMarketCode] : next,
                  });
                };

                return (
                  <div
                    key={m.code}
                    role="checkbox"
                    aria-checked={isSelected}
                    aria-disabled={isUnavailable || isPrimary || undefined}
                    tabIndex={0}
                    onClick={toggleMarket}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      toggleMarket();
                    }}
                    className={`p-4 rounded-xl border transition-all duration-fast cursor-pointer flex flex-col justify-between focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      isSelected
                        ? "border-primary bg-primary-light/40 ring-1 ring-primary shadow-xs"
                        : isCatEnabled
                          ? "border-border-base bg-white hover:bg-stone-50"
                          : "border-stone-200 bg-stone-50/70 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{m.flag}</span>
                          <div>
                            <div className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                              {m.name}
                              <span className="text-micro text-stone-500 font-semibold">
                                ({m.code})
                              </span>
                            </div>
                            <div className="text-micro text-stone-500">
                              Devise :{" "}
                              {effectiveCfg.localization.defaultCurrency} (
                              {effectiveCfg.localization.currencySymbol})
                            </div>
                          </div>
                        </div>

                        <span
                          aria-hidden="true"
                          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-fast ${
                            isSelected
                              ? "border-primary bg-primary text-white"
                              : "border-stone-300 bg-white text-transparent"
                          }`}
                        >
                          <Check className="h-icon-sm w-icon-sm" />
                        </span>
                      </div>

                      {/* Market Badges & Rules */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {isPrimary && (
                          <span className="text-micro bg-primary text-white font-bold px-2 py-0.5 rounded-full">
                            {t(
                              "publishing.publishWizard.marcheDOriginePrincipal",
                            )}
                          </span>
                        )}
                        {isCatEnabled ? (
                          <span className="text-micro bg-success-surface text-success font-bold px-2 py-0.5 rounded-full">
                            {t("publishing.publishWizard.categorieEligible")}
                          </span>
                        ) : (
                          <span className="text-micro bg-stone-200 text-stone-600 font-semibold px-2 py-0.5 rounded-full">
                            {t("publishing.publishWizard.categorieRestreinte")}
                          </span>
                        )}
                        {effectiveCfg.delivery?.enabled && (
                          <span className="text-micro bg-info-surface text-info font-medium px-2 py-0.5 rounded-full">
                            {t("publishing.publishWizard.livraison")}
                          </span>
                        )}
                        {effectiveCfg.payments?.enabled && (
                          <span className="text-micro bg-purple-50 text-purple-700 font-medium px-2 py-0.5 rounded-full">
                            {t("publishing.publishWizard.sequestre")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Transborder Note for Special Currencies */}
                    {effectiveCfg.localization.defaultCurrency !==
                      defaultCurrency && (
                      <div className="text-micro text-warning bg-warning-surface rounded-lg p-1.5 mt-3 font-medium">
                        Conversion automatique en{" "}
                        {effectiveCfg.localization.defaultCurrency} pour les
                        acheteurs locaux.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Cross-border Protection Notice */}
            <div className="p-4 bg-bg-base rounded-xl border border-border-base flex items-start gap-3">
              <ShieldCheck className="w-icon-lg h-icon-lg text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-stone-700 space-y-1">
                <span className="font-bold text-stone-900">
                  {t(
                    "publishing.publishWizard.garantieSecuriteTransfrontaliere",
                  )}
                </span>
                <p>
                  {t(
                    "publishing.publishWizard.toutesLesTransactionsMultiMarches",
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* VISIBILITY BOOST OPTIONS */}
          <div className="bg-white rounded-2xl border border-border-base p-6 sm:p-8 space-y-6 shadow-xs">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900">
                {t(
                  "publishing.publishWizard.optionsDeVisibiliteBoostFacultatif",
                )}
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                {t("publishing.publishWizard.multipliezVosVuesEnPositionnant")}
              </p>
            </div>

            {visibilityOffersState === "error" && (
              <div className="rounded-xl border border-warning-border bg-warning-surface p-3 text-xs text-warning">
                {t("publishing.publishWizard.paidOptionsUnavailable")}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  id: "standard",
                  name:
                    schema?.publication.standardPolicy.label ||
                    "Publication standard gratuite",
                  priceEur: 0,
                  description: t("publishing.publishWizard.standardIncludes", {
                    photos:
                      schema?.publication.standardPolicy.mediaAllowance || 12,
                    days: schema?.publication.standardPolicy.durationDays || 60,
                  }),
                },
                ...visibilityOffers,
              ].map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() =>
                    updateDraft({
                      boostPackage:
                        pack.id === "standard" ? undefined : pack.id,
                    })
                  }
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    (pack.id === "standard" && !draft.boostPackage) ||
                    draft.boostPackage === pack.id
                      ? "border-primary bg-primary-light/60 ring-1 ring-primary"
                      : "border-border-base bg-white hover:bg-stone-50"
                  }`}
                >
                  <div>
                    <div className="text-xs font-black text-stone-900">
                      {pack.name}
                    </div>
                    <div className="text-micro text-stone-500 mt-1">
                      {pack.description}
                    </div>
                  </div>
                  <div className="text-sm font-black text-primary mt-3">
                    {pack.priceEur === 0
                      ? t("publishing.publishWizard.free")
                      : formatPrice(pack.priceEur)}
                  </div>
                </button>
              ))}
            </div>
            {visibilityOffersState === "loading" && (
              <p className="text-xs text-stone-500" role="status">
                {t("publishing.publishWizard.loadingOptionalOffers")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 10: REVIEW & INSTANT PUBLISH */}
      {/* ========================================================================= */}
      {/* Review is the tail of the final phase, not a screen of its own — the
          seller reads it directly above the publish button. */}
      {showsPanel(REVIEW_PANEL) && (
        <div className="bg-white rounded-2xl border border-primary-border ring-1 ring-primary-border p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">
              {t("publishing.publishWizard.recapitulatifDeVotreAnnonce")}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              {t("publishing.publishWizard.relisezVotreAnnonceVousPourrez")}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Summary Details */}
            <div className="lg:col-span-7 space-y-4 text-xs">
              <div className="p-4 bg-bg-base rounded-xl border border-border-base space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                  <span className="text-stone-500">
                    {t("publishing.publishWizard.categorie")}
                  </span>
                  <span className="font-bold text-stone-900">
                    {schema?.node
                      ? getTaxonomyLabel(schema.node, "compact")
                      : ""}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                  <span className="text-stone-500">Titre</span>
                  <span className="font-bold text-stone-900 truncate max-w-50">
                    {draft.title}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                  <span className="text-stone-500">Prix</span>
                  <span className="font-black text-primary text-sm">
                    {draft.pricing.isFreeDonation
                      ? "Don gratuit"
                      : formatPrice(draft.pricing.amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                  <span className="text-stone-500">
                    {t("publishing.publishWizard.marchesDeDiffusion")}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 justify-end">
                    {(draft.selectedMarkets || [defaultMarketCode]).map(
                      (mCode) => {
                        const m = marketService.getMarketByCode(mCode);
                        return (
                          <span
                            key={mCode}
                            className="text-micro font-bold bg-white border border-border-base px-2 py-0.5 rounded-full text-stone-800"
                          >
                            {m?.flag || "🌐"} {m?.name || mCode}{" "}
                            {mCode === defaultMarketCode ? "(Principal)" : ""}
                          </span>
                        );
                      },
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                  <span className="text-stone-500">
                    {t("publishing.publishWizard.modesDeTransaction")}
                  </span>
                  <span className="font-semibold text-stone-800">
                    {[
                      draft.transaction.allowDirectPurchase && "Achat en ligne",
                      draft.transaction.allowReservation && "Réservation",
                      draft.transaction.allowContact && "Contact",
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-500">Localisation</span>
                  <span className="font-bold text-stone-900">
                    {draft.location.city} ({draft.location.postalCode})
                  </span>
                </div>
              </div>

              {/* Multi-market compliance badge */}
              <div className="p-3.5 bg-success-surface border border-success-border rounded-xl flex items-center gap-2.5">
                <CheckCircle2 className="w-icon-md h-icon-md text-success shrink-0" />
                <span className="text-xs font-bold text-success">
                  Prête à être publiée sur{" "}
                  {(draft.selectedMarkets || [defaultMarketCode]).length} marché
                  {(draft.selectedMarkets || [defaultMarketCode]).length > 1
                    ? "s"
                    : ""}{" "}
                  Shongre.
                </span>
              </div>
            </div>

            {/* Right Live Card Preview */}
            <div className="lg:col-span-5 space-y-2">
              <div className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                {t("publishing.publishWizard.apercuDansLesResultatsDe")}
              </div>
              <ListingCard
                listing={{
                  id: "preview",
                  title: draft.title || "Titre de l'annonce",
                  description: draft.description,
                  price: draft.pricing.isFreeDonation
                    ? 0
                    : draft.pricing.amount,
                  originalPrice: draft.pricing.originalPrice,
                  isNegotiable: draft.pricing.isNegotiable,
                  isFreeDonation: draft.pricing.isFreeDonation,
                  categorySlug: schema?.ancestors[0]?.slug || "maison-deco",
                  subCategorySlug: schema?.node.slug || "mobilier",
                  categoryLabel: schema?.ancestors[0]
                    ? getTaxonomyLabel(schema.ancestors[0], "compact")
                    : "Maison",
                  subCategoryLabel: schema?.node
                    ? getTaxonomyLabel(schema.node, "compact")
                    : "Mobilier",
                  condition: draft.condition as any,
                  sellerId: currentUser?.id || "demo",
                  sellerName: currentUser?.name || "Vendeur Shongre",
                  sellerType:
                    currentUser?.role === "pro_seller" ? "pro" : "individual",
                  sellerRating: 5.0,
                  sellerReviewCount: 12,
                  sellerIsVerified: true,
                  sellerCity: draft.location.city,
                  sellerPostalCode: draft.location.postalCode,
                  city: draft.location.city,
                  postalCode: draft.location.postalCode,
                  department: currentUser?.department || "",
                  region: currentUser?.region || "",
                  photos: draft.photos as any,
                  coverImageUrl: draft.photos[0]?.url || "",
                  deliveryOptions: [
                    {
                      type: "hand_delivery",
                      available: draft.fulfillment.allowHandDelivery,
                    },
                    {
                      type: "home_delivery",
                      available: draft.fulfillment.allowParcelShipping,
                    },
                  ],
                  isOnlinePaymentAvailable:
                    draft.transaction.allowDirectPurchase,
                  isReservable: draft.transaction.allowReservation,
                  attributes: draft.attributes,
                  status: "active",
                  marketCodes: draft.selectedMarkets || [defaultMarketCode],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  expiresAt: new Date().toISOString(),
                  viewsCount: 0,
                  favoritesCount: 0,
                  contactCount: 0,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Primary actions, actually pinned.
          This was labelled "sticky" but rendered as an ordinary block at the end
          of the page, so on a phone "Continuer" sat below a full screen of form
          — the user had to scroll to the bottom after every field group to
          advance. It now stays on screen, clears the home indicator via the
          safe-area inset, and keeps the step's one primary action reachable. */}
      <div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pb-safe-area-bottom pt-3 bg-bg-base/95 backdrop-blur-sm border-t border-border-base z-sticky">
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-border-base shadow-xs flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={handlePrevStep}
            disabled={currentStep === 1 || isPublishing}
            leftIcon={<ArrowLeft className="w-icon-md h-icon-md" />}
          >
            {t("publishing.publishWizard.precedent")}
          </Button>

          <div className="flex items-center gap-2">
            {currentStep < PHASES.length ? (
              <Button
                variant="primary"
                size="md"
                onClick={handleNextStep}
                rightIcon={<ArrowRight className="w-icon-md h-icon-md" />}
              >
                <span className="hidden sm:inline">
                  Continuer : {PHASES[currentStep]?.label || ""}
                </span>
                <span className="sm:hidden">Continuer</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={handleFinalPublish}
                isLoading={isPublishing}
                leftIcon={<CheckCircle2 className="w-icon-lg h-icon-lg" />}
              >
                {t("publishing.publishWizard.publierMonAnnonceMaintenant")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
