import { PAGE_SIZES } from "../../configuration/pagination.config";
import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import {
  useParams,
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  Share2,
  Flag,
  MapPin,
  Clock,
  ShieldCheck,
  ChevronRight,
  MessageSquare,
  DollarSign,
  ShoppingBag,
  CheckCircle2,
  Send,
  Edit3,
  Sliders,
  Star,
} from "lucide-react";
import { routes } from "../../configuration/routes";
import { listingRepository } from "../../repositories/listing.repository";
import { userRepository } from "../../repositories/user.repository";
import { services } from "../../api/client/service-registry";
import { Listing, UserProfile, Transaction } from "../../types";
import { taxonomyService } from "../../domains/taxonomy/taxonomy.service";
import { TaxonomyMigration } from "../../domains/taxonomy/taxonomy.migration";
import { transactionCapabilitiesService } from "../../domains/transaction/transaction.capabilities";
import { listingDisplayResolver } from "../../domains/listing/listing.display";
import { listingActionsResolver } from "../../domains/listing/listing.actions";
import { useStaffMarketplaceAccess } from "../../security/useStaffMarketplaceAccess";
import {
  formatPrice,
  formatRelativeDate,
  calculateBuyerFee,
  plural,
} from "../../utilities/formatters";
import { Breadcrumbs, FavoriteButton, PriceDisplay } from "../../design-system";
import { Button } from "../../design-system/primitives/Button";
import { StatePanel } from "../../design-system/primitives/StatePanel";
import { Badge } from "../../design-system/primitives/Badge";
import { Modal } from "../../design-system/primitives/Modal";
import {
  Input,
  Textarea,
  FormField,
} from "../../design-system/primitives/FormField";
import { ListingCard } from "../../design-system/primitives/ListingCard";
import { ListingRail } from "../../design-system/primitives/ListingRail";
import { Image } from "../../design-system/primitives/Image";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { useFavorites } from "../../app/providers/FavoritesProvider";
import { usePageMeta } from "../../hooks/usePageMeta";
import { storageService } from "../../services/storage.service";
import { analyticsService } from "../../services/analytics.service";
import { isProSeller } from "../../domains/user/user.domain";
import { DirectPurchaseCheckoutModal } from "../transactions/DirectPurchaseCheckoutModal";
import { ReservationCheckoutModal } from "../transactions/components/ReservationCheckoutModal";
import { ListingMediaGallery } from "./components/ListingMediaGallery";
import { ListingCharacteristics } from "./components/ListingCharacteristics";
import { DropdownMenu } from "../../design-system/primitives/DropdownMenu";
import { ListingFulfillmentSummary } from "./components/ListingFulfillmentSummary";
import { ListingSellerTrustSection } from "./components/ListingSellerTrustSection";
import { ListingSafetyNotice } from "./components/ListingSafetyNotice";
import { useTranslation } from "../../i18n/I18nProvider";
import {
  getListingCategoryLabel,
  getListingSubCategoryLabel,
} from "../../domains/taxonomy/taxonomy.display";
import { publicListingUrl } from "../../domains/market/market-routing";
import { usePublicRouteData } from "../../app/providers/PublicRouteDataProvider";
import {
  pageMetaForPolicy,
  resolveSeoPolicy,
  structuredDataForPolicy,
} from "../../platform/seo/seo-policy";

export const ListingDetailPage: React.FC = () => {
  const { activeMarket, marketContext } = useMarketLocation();
  const countryCode = marketContext?.countryCode ?? activeMarket.code;
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { isReadOnly: isReadOnlyStaff } = useStaffMarketplaceAccess();
  const toast = useToast();
  const { isFavorite: isListingFavorite, toggleFavorite } = useFavorites();
  const publicRouteData = usePublicRouteData();
  const initialData =
    publicRouteData?.kind === "listing" && publicRouteData.listing.id === id
      ? publicRouteData
      : null;

  const [listing, setListing] = useState<Listing | null>(
    initialData?.listing ?? null,
  );
  const [seller, setSeller] = useState<UserProfile | null>(
    initialData?.seller ?? null,
  );
  const [similarListings, setSimilarListings] = useState<Listing[]>(
    initialData?.similarListings ?? [],
  );
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(!initialData);

  // Modal Dialog States
  const [isDirectPurchaseModalOpen, setIsDirectPurchaseModalOpen] =
    useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Form Fields
  const [messageText, setMessageText] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [reportReason, setReportReason] = useState("suspicious");
  const [reportDetails, setReportDetails] = useState("");
  const trackedListingId = useRef<string | null>(null);

  // 1. Data Fetching
  useEffect(() => {
    if (!id) return;
    if (initialData?.listing.id === id) {
      storageService.addRecentlyViewed(initialData.listing.id);
      if (trackedListingId.current !== initialData.listing.id) {
        trackedListingId.current = initialData.listing.id;
        analyticsService.track("listing_viewed", {
          listingId: initialData.listing.id,
          sellerId: initialData.listing.sellerId,
          categoryId: initialData.listing.categorySlug,
        });
      }
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    listingRepository.getListingById(id).then((item) => {
      if (item) {
        setListing(item);

        /* Viewing a listing is what makes it recently viewed. The storage layer
           has always known how to record this — deduplicating, newest first,
           capped at ten — but nothing ever called it, so the history it handed
           back was the seeded fixture and never the visitor's own browsing. */
        storageService.addRecentlyViewed(item.id);
        if (trackedListingId.current !== item.id) {
          trackedListingId.current = item.id;
          analyticsService.track("listing_viewed", {
            listingId: item.id,
            sellerId: item.sellerId,
            categoryId: item.categorySlug,
          });
        }

        userRepository.getUserById(item.sellerId).then((sellerUser) => {
          if (sellerUser) setSeller(sellerUser);
        });

        // Load similar listings by category
        listingRepository
          .getListings({
            categorySlug: item.categorySlug,
            limit: PAGE_SIZES.similarListings,
          })
          .then((res) => {
            setSimilarListings(
              res.listings.filter((l) => l.id !== item.id).slice(0, 4),
            );
          });
      }
      setIsLoading(false);
    });
  }, [id, initialData]);

  // 2. Taxonomy & Market resolution
  const taxonomyNode = useMemo(() => {
    if (!listing) return null;
    return (
      TaxonomyMigration.resolveCanonicalNode(listing.subCategorySlug) ||
      TaxonomyMigration.resolveCanonicalNode(listing.categorySlug) ||
      taxonomyService.getNode(listing.subCategorySlug) ||
      taxonomyService.getNodeBySlug(listing.subCategorySlug) ||
      taxonomyService.getNode(listing.categorySlug) ||
      taxonomyService.getNodeBySlug(listing.categorySlug)
    );
  }, [listing]);

  const displayCategoryLabel = listing ? getListingCategoryLabel(listing) : "";
  const displaySubCategoryLabel = listing
    ? getListingSubCategoryLabel(listing)
    : "";

  // 3. Capabilities & Actions Resolution
  const transactionCaps = useMemo(() => {
    if (!listing)
      return {
        canContact: true,
        canDirectPurchase: false,
        canReserve: false,
        defaultModes: ["CONTACT_ONLY" as const],
      };
    return transactionCapabilitiesService.resolve({
      taxonomyNodeId:
        taxonomyNode?.id || listing.subCategorySlug || listing.categorySlug,
      marketCode: listing.marketCode,
      sellerType: listing.sellerType,
      sellerIsVerified: listing.sellerIsVerified,
      price: listing.price,
    });
  }, [listing, taxonomyNode]);

  const actions = useMemo(() => {
    if (!listing) {
      return {
        isOwner: false,
        ownerActions: [],
        primaryAction: "none" as const,
        canDirectPurchase: false,
        canReserve: false,
        canContact: false,
        canMakeOffer: false,
        statusNotice: null,
      };
    }
    return listingActionsResolver.resolve({
      listing,
      viewer: currentUser,
      seller,
      transactionCapabilities: transactionCaps,
      taxonomyPrimaryCta: taxonomyNode?.publication?.primaryCta,
    });
  }, [listing, currentUser, seller, transactionCaps, taxonomyNode]);

  const contactActionLabel = useMemo(() => {
    switch (taxonomyNode?.publication?.primaryCta) {
      case "apply":
        return "Postuler";
      case "request_quote":
        return "Demander un devis";
      case "request_visit":
        return "Demander une visite";
      case "request_test_drive":
        return "Demander un essai";
      case "request_lesson":
        return "Demander un cours";
      case "check_availability":
        return "Vérifier la disponibilité";
      case "propose_exchange":
        return "Proposer un échange";
      default:
        return t("listings.listingDetailPage.message");
    }
  }, [taxonomyNode, t]);

  /**
   * Publishes the action bar's real height so the layout can reserve room below
   * the footer for it.
   *
   * A fixed bar cannot be cleared with padding on this page — the footer is not
   * inside it. Measuring rather than hard-coding matters because the height is a
   * function of state: 61px in one row from `sm`, 83px for a status notice, 91px
   * for one or two actions, 135px for a wrapped four-action grid.
   */
  const actionBarRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = actionBarRef.current;
    const root = document.documentElement;
    if (!node) {
      root.style.removeProperty("--page-bottom-inset");
      return;
    }
    const publish = () => {
      // The bar is `lg:hidden`, so above `lg` it measures 0 and reserves nothing.
      const height = node.getBoundingClientRect().height;
      root.style.setProperty(
        "--page-bottom-inset",
        height > 0 ? `${Math.ceil(height)}px` : "0px",
      );
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(node);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--page-bottom-inset");
    };
  });

  /**
   * How many controls the mobile action bar will paint.
   *
   * The bar lays them out in one row from `sm` and in a two-column grid below
   * it, so a single action must not be left sitting in a half-width column.
   */
  const mobileActionCount = useMemo(() => {
    if (actions.isOwner || actions.statusNotice) return 1;
    return [
      actions.canMakeOffer,
      actions.canReserve,
      actions.canContact,
      actions.canDirectPurchase,
    ].filter(Boolean).length;
  }, [actions]);

  /**
   * Three-action layouts keep the primary CTA on its own row. Four-action
   * layouts are a balanced 2×2 grid so the second row (Message/Acheter) aligns
   * with the first row (Offre/Réserver) instead of stacking two full-width
   * controls below it.
   */
  const mobileActionClass = (
    action: "offer" | "reservation" | "contact" | "direct_purchase",
  ) => {
    if (mobileActionCount === 4) return "";
    const isPrimary = actions.primaryAction === action;
    if (mobileActionCount <= 2) return "";

    const classes = [
      isPrimary ? "col-span-2" : "",
      isPrimary ? "order-last" : "",
    ];

    return classes.filter(Boolean).join(" ");
  };

  // 4. Characteristics & Summary derivation
  const summaryAttributes = useMemo(() => {
    if (!listing) return [];
    return listingDisplayResolver.resolveSummaryAttributes(
      listing,
      taxonomyNode,
    );
  }, [listing, taxonomyNode]);

  const groupedCharacteristics = useMemo(() => {
    if (!listing) return [];
    return listingDisplayResolver.resolveGroupedCharacteristics(
      listing,
      taxonomyNode,
    );
  }, [listing, taxonomyNode]);

  const pageMeta = useMemo(() => {
    if (!listing || !marketContext) {
      return { title: undefined, noIndex: true, follow: false };
    }
    const routeData = {
      status: "found" as const,
      data: {
        kind: "listing" as const,
        listing,
        seller,
        similarListings,
      },
    };
    const policy = resolveSeoPolicy({
      pathname: `/annonce/${listing.id}`,
      marketContext,
      routeData,
    });
    return pageMetaForPolicy(
      policy,
      structuredDataForPolicy(policy, marketContext, routeData),
    );
  }, [listing, marketContext, seller, similarListings]);

  usePageMeta(pageMeta);

  useEffect(() => {
    if (!listing || !currentUser || isReadOnlyStaff) return;
    const shouldContact = searchParams.get("contact") === "1";
    const shouldOffer = searchParams.get("offer") === "1";
    if (!shouldContact && !shouldOffer) return;
    if (shouldContact) setIsContactModalOpen(true);
    if (shouldOffer) setIsOfferModalOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("contact");
    next.delete("offer");
    setSearchParams(next, { replace: true });
  }, [currentUser, isReadOnlyStaff, listing, searchParams, setSearchParams]);

  // Handlers
  /**
   * Saving goes through the shared favourites store, not straight to storage.
   *
   * Writing to storage directly left this page as a second source of truth for
   * the same fact: the write landed, but the header count and every card
   * elsewhere kept the old value until an unrelated re-render corrected them —
   * which is the exact desync FavoritesProvider was introduced to end.
   */
  const handleFavoriteToggle = async () => {
    if (!listing) return;
    try {
      const next = await toggleFavorite(listing.id);
      toast.info(
        next
          ? "Annonce ajoutée à vos favoris"
          : "Annonce retirée de vos favoris",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de mettre à jour vos favoris.",
      );
    }
  };

  const handleShare = () => {
    if (!listing) return;
    const shareUrl = publicListingUrl({
      listingId: listing.id,
      countryCode,
    });
    if (navigator.share) {
      void navigator.share({ title: listing.title, url: shareUrl });
    } else {
      void navigator.clipboard.writeText(shareUrl);
      toast.success(
        "Le lien de l'annonce a été copié dans votre presse-papiers.",
      );
    }
  };

  const handleSendMessage = async () => {
    if (!listing || !messageText.trim()) return;
    const buyerId = currentUser ? currentUser.id : "guest-user";
    const buyerName = currentUser ? currentUser.name : "Visiteur";

    const conversation = await services.messaging.createOrGetConversation({
      listingId: listing.id,
      buyerId,
      buyerName,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      initialMessage: messageText.trim(),
    });

    setIsContactModalOpen(false);
    setMessageText("");
    toast.success("Votre message a bien été envoyé au vendeur !");
    navigate(routes.workspace.messages(conversation.id));
  };

  const handleSendOffer = async () => {
    if (!listing) return;
    const numPrice = Number(offerPrice);
    if (isNaN(numPrice) || numPrice <= 0) {
      toast.error("Veuillez entrer un montant valide.");
      return;
    }

    const buyerId = currentUser ? currentUser.id : "user-thomas";
    const buyerName = currentUser ? currentUser.name : "Thomas Laurent";

    const conv = await services.messaging.createOrGetConversation({
      listingId: listing.id,
      buyerId,
      buyerName,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      initialMessage: `Proposition d'offre de prix : ${formatPrice(numPrice)} (Prix initial : ${formatPrice(listing.price)})`,
    });

    await services.messaging.makeOffer(conv.id, buyerId, buyerName, numPrice);

    setIsOfferModalOpen(false);
    setOfferPrice("");
    toast.success(
      `Votre offre de ${formatPrice(numPrice)} a été transmise au vendeur.`,
    );
    navigate(routes.workspace.messages(conv.id));
  };

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
        <div className="h-4 bg-stone-200 rounded w-1/4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="aspect-16/10 bg-stone-200 rounded-2xl" />
            <div className="h-8 bg-stone-200 rounded w-3/4" />
            <div className="h-32 bg-stone-200 rounded-2xl" />
          </div>
          <div className="h-80 bg-stone-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Not Found State
  if (!listing) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="sr-only">
          {t("listings.listingDetailPage.annonceIntrouvable")}
        </h1>
        <StatePanel
          variant="notFound"
          title={t("listings.listingDetailPage.annonceIntrouvableOuSupprimee")}
          description={t("listings.listingDetailPage.cetteAnnonceNEstPlus")}
          action={
            <Button variant="primary" to={routes.search()}>
              {t("listings.listingDetailPage.explorerLesAnnoncesSimilaires")}
            </Button>
          }
          secondaryAction={
            <Button variant="outline" to={routes.home()}>
              {t("listings.listingDetailPage.retourALAccueil")}
            </Button>
          }
        />
      </div>
    );
  }

  const buyerFee = calculateBuyerFee(listing.price);
  // Buyer protection only applies to online payment, so it is the only case where
  // the price shown to the buyer differs from the amount they actually pay.
  const showsBuyerFee =
    Boolean(listing.isOnlinePaymentAvailable) && listing.price > 0;
  const breadcrumbItems = [
    { label: "Accueil", href: routes.home() },
    {
      label: displayCategoryLabel,
      href: routes.category(listing.categorySlug),
    },
    ...(displaySubCategoryLabel &&
    displaySubCategoryLabel !== displayCategoryLabel
      ? [
          {
            label: displaySubCategoryLabel,
            href: routes.category(listing.categorySlug, {
              subCategory: listing.subCategorySlug,
            }),
          },
        ]
      : []),
    { label: listing.title },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32 lg:pb-6 space-y-6">
      {/* Top Bar: Breadcrumbs & Secondary Tools */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Breadcrumbs items={breadcrumbItems} />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            aria-label={t("listings.listingDetailPage.partagerLAnnonce")}
            className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white border border-border-base px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            <Share2 className="w-icon-sm h-icon-sm" />
            <span className="hidden sm:inline">Partager</span>
          </button>
          <button
            type="button"
            data-marketplace-action="listing.report"
            onClick={() => setIsReportModalOpen(true)}
            aria-label={t("listings.listingDetailPage.signalerCetteAnnonce")}
            className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-danger bg-white border border-border-base px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            <Flag className="w-icon-sm h-icon-sm" />
            <span className="hidden sm:inline">Signaler</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Column (Gallery + Details) / Right Column (Action Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Media, Primary Summary, Characteristics, Description, Seller */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. MEDIA GALLERY */}
          <ListingMediaGallery
            photos={listing.photos}
            title={listing.title}
            overlayActions={
              <FavoriteButton
                isFavorite={isListingFavorite(listing.id)}
                onToggle={handleFavoriteToggle}
                size="md"
                variant="floating"
              />
            }
          />

          {/* 2. PRIMARY SUMMARY CARD */}
          <div className="bg-white rounded-3xl border border-stone-200/60 p-6 sm:p-8 space-y-5 shadow-sm relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start gap-4 relative z-raised">
              <div className="space-y-2 flex-1">
                {/* Badges strip: Category, Pro, Boosted */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Badge variant="primary" size="md">
                    {displayCategoryLabel}
                  </Badge>
                  {isProSeller(listing) && (
                    <Badge variant="pro" size="md">
                      {t("listings.listingDetailPage.vendeurPro")}
                    </Badge>
                  )}
                  {(listing.promotionState === "active" ||
                    listing.isBoosted) && (
                    <Badge
                      variant={
                        listing.promotionType === "urgent_badge" ||
                        listing.boostType === "urgent"
                          ? "urgent"
                          : "featured"
                      }
                      size="md"
                      icon
                    >
                      {listing.discovery?.isSponsored
                        ? listing.discovery.promotionLabel || "Sponsorisé"
                        : listing.promotionLabel ||
                          (listing.promotionType === "search_bump" ||
                          listing.boostType === "top_of_list"
                            ? "Remonté · sponsorisé"
                            : listing.promotionType === "urgent_badge" ||
                                listing.boostType === "urgent"
                              ? "Urgent"
                              : "À la une · sponsorisé")}
                    </Badge>
                  )}
                </div>

                {/* Main H1 Title */}
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-900 leading-tight tracking-tight">
                  {listing.title}
                </h1>
              </div>
            </div>

            {/* Main Price on Mobile (< lg) */}
            <div className="lg:hidden pt-2 pb-3">
              <PriceDisplay
                price={listing.price}
                originalPrice={listing.originalPrice}
                isNegotiable={listing.isNegotiable}
                isFreeDonation={listing.isFreeDonation}
                size="xl"
              />
            </div>

            {/* Summary Attributes Tags (Key Decision Criteria) */}
            {summaryAttributes.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-2">
                {summaryAttributes.map((attrText, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3.5 py-2 rounded-xl bg-stone-50 text-xs font-bold text-stone-700 border border-stone-200/60"
                  >
                    {attrText}
                  </span>
                ))}
              </div>
            )}

            {/* Metadata Footer: Location, Publication Date */}
            <div className="flex items-center gap-4 text-xs font-medium text-stone-500 pt-5 mt-2 border-t border-stone-100 flex-wrap">
              <span className="flex items-center gap-1.5 text-stone-700">
                <MapPin className="w-icon-md h-icon-md text-primary" />
                {listing.city} ({listing.postalCode})
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-icon-md h-icon-md text-stone-400" />
                Publiée {formatRelativeDate(listing.createdAt)}
              </span>
            </div>
          </div>

          {/* 3. GROUPED TECHNICAL CHARACTERISTICS */}
          <ListingCharacteristics groups={groupedCharacteristics} />

          {/* 4. DESCRIPTION */}
          <div className="bg-white rounded-3xl border border-stone-200/60 p-6 sm:p-8 space-y-4 shadow-sm">
            <h2 className="text-base font-black text-stone-900 pb-3 border-b border-stone-100 flex items-center gap-2">
              Description
            </h2>
            <div
              className={`text-sm text-stone-600 leading-loose whitespace-pre-line font-medium ${
                !isDescriptionExpanded && listing.description.length > 450
                  ? "line-clamp-6 relative"
                  : ""
              }`}
            >
              {listing.description}
              {!isDescriptionExpanded && listing.description.length > 450 && (
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
              )}
            </div>

            {listing.description.length > 450 && (
              <button
                type="button"
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="inline-flex min-h-6 cursor-pointer items-center pt-2 text-sm font-bold text-primary transition-colors hover:text-primary-hover hover:underline"
              >
                {isDescriptionExpanded ? "Afficher moins" : "Afficher la suite"}
              </button>
            )}
          </div>

          {/* 5. FULFILLMENT & DELIVERY SUMMARY */}
          <ListingFulfillmentSummary listing={listing} />

          {/* 6. COMPACT SELLER IDENTITY & TRUST */}
          {seller && <ListingSellerTrustSection seller={seller} reviews={[]} />}

          {/* 7. SAFETY REASSURANCE NOTICE */}
          <ListingSafetyNotice
            isOnlinePaymentAvailable={listing.isOnlinePaymentAvailable}
          />

          {/* 8. LISTING BOTTOM METADATA */}
          <div className="p-4 rounded-xl bg-bg-base/60 text-micro text-stone-500 flex items-center justify-between flex-wrap gap-2 border border-border-subtle">
            <span>
              {t("listings.listingDetailPage.referenceAnnonce")}{" "}
              <strong className="font-mono text-stone-700">{listing.id}</strong>
            </span>
            <Link
              to={routes.contact({ context: "listing", listingId: listing.id })}
              className="inline-flex min-h-6 items-center gap-1 font-bold text-primary hover:underline"
            >
              {t("listings.listingDetailPage.signalerOuDemanderDeL")}
            </Link>
            <span>
              Dernière mise à jour :{" "}
              {formatRelativeDate(listing.updatedAt || listing.createdAt)}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Desktop Sticky Action & Transaction Panel */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200/60 p-6 sm:p-8 space-y-6 shadow-md sticky top-24">
            {/* Price Box — the item price only.
                The fee breakdown that used to sit here was removed for two
                reasons. It quoted `calculateBuyerFee` (4% + 0.70 €), while
                checkout actually charges via `fulfillmentResolver` (4% + 0.99 €,
                and waived entirely for hand delivery) — so the panel advertised
                a total the buyer would never be charged. And the real total
                depends on the delivery method, which is not chosen yet at this
                point. The fee is disclosed, itemised, in the checkout and
                reservation flows where the amount is actually known. */}
            <div className="space-y-1">
              <span className="text-xs text-stone-500 font-bold uppercase tracking-wider block">
                {t("listings.listingDetailPage.prixDeLArticle")}
              </span>
              <PriceDisplay
                price={listing.price}
                originalPrice={listing.originalPrice}
                isNegotiable={listing.isNegotiable}
                isFreeDonation={listing.isFreeDonation}
                size="xl"
              />
              {listing.isOnlinePaymentAvailable && listing.price > 0 && (
                <p className="flex items-center gap-1.5 text-xs text-stone-500 pt-1.5">
                  <ShieldCheck className="w-icon-md h-icon-md text-success shrink-0" />
                  {t(
                    "listings.listingDetailPage.protectionAcheteurIncluseCalculeeAu",
                  )}
                </p>
              )}
            </div>

            {/* Seller identity.
                Who you are buying from belongs next to the price and the buy
                button, not only further down the page — it is part of the same
                decision. */}
            {seller && (
              <Link
                to={
                  isProSeller(seller)
                    ? routes.seller.storefront(
                        seller.storeSlug || seller.slug || seller.id,
                      )
                    : routes.seller.profile(seller.slug || seller.id)
                }
                className="group flex items-start gap-3 p-4 rounded-2xl border border-stone-200/60 bg-stone-50/60 hover:bg-stone-50 hover:border-stone-300 transition-colors"
              >
                <div className="relative shrink-0">
                  <Image
                    src={seller.avatarUrl}
                    alt=""
                    sizes="44px"
                    className="w-11 h-11 rounded-full object-cover border border-stone-200"
                  />
                  {seller.isVerified && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-success text-white flex items-center justify-center border-2 border-white"
                      aria-hidden="true"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-sm text-stone-900 truncate group-hover:text-primary transition-colors">
                      {seller.name}
                    </span>
                    {isProSeller(seller) && (
                      <Badge variant="pro" size="sm">
                        Pro
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-1 flex-wrap">
                    {seller.rating > 0 && (
                      <span className="flex items-center gap-1 font-semibold text-stone-700">
                        <Star className="w-icon-sm h-icon-sm fill-amber-400 text-amber-400" />
                        {seller.rating.toFixed(1)}
                        <span className="font-normal text-stone-500">
                          ({plural(seller.reviewCount || 0, "avis", "avis")})
                        </span>
                      </span>
                    )}
                    {seller.rating > 0 && seller.city && (
                      <span aria-hidden="true">·</span>
                    )}
                    {seller.city && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-icon-sm h-icon-sm text-stone-400 shrink-0" />
                        {seller.city}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-icon-md h-icon-md text-stone-400 shrink-0 mt-1 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>
            )}

            {/* ===================================================================== */}
            {/* OWNER ACTIONS vs BUYER ACTIONS */}
            {/* ===================================================================== */}
            {actions.isOwner ? (
              <div className="p-5 bg-primary/5 border border-primary/20 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <Edit3 className="w-icon-md h-icon-md" />
                  <span>
                    {t("listings.listingDetailPage.vousEtesLAuteurDe")}
                  </span>
                </div>
                <div className="space-y-2">
                  <Button
                    data-marketplace-action="listing.publish"
                    to={`/deposer?edit=${listing.id}`}
                    variant="primary"
                    size="md"
                    fullWidth
                    leftIcon={<Edit3 className="w-icon-md h-icon-md" />}
                  >
                    {t("listings.listingDetailPage.modifierMonAnnonce")}
                  </Button>
                  <Button
                    data-marketplace-action="listing.manage"
                    to="/compte/annonces"
                    variant="outline"
                    size="md"
                    fullWidth
                    leftIcon={<Sliders className="w-icon-md h-icon-md" />}
                  >
                    {t("listings.listingDetailPage.gererMesAnnoncesStats")}
                  </Button>
                </div>
              </div>
            ) : actions.statusNotice ? (
              /* Non-Active Status Notice (Reserved, Sold, Expired) */
              <div className="p-5 bg-warning-surface border border-warning-border rounded-2xl space-y-3 text-center">
                <div className="flex items-center justify-center gap-2 font-bold text-warning text-base">
                  <Clock className="w-icon-lg h-icon-lg text-warning" />
                  <span>{actions.statusNotice.title}</span>
                </div>
                <p className="text-sm text-warning leading-relaxed font-medium">
                  {actions.statusNotice.message}
                </p>
                {actions.statusNotice.isBuyerReserver && (
                  <Button
                    data-marketplace-action="purchase.manage"
                    to="/compte/achats"
                    variant="primary"
                    size="md"
                    fullWidth
                    className="mt-2"
                  >
                    Consulter ma commande
                  </Button>
                )}
              </div>
            ) : (
              /* Active Listing Buyer Actions */
              /* Every action in this panel shares one geometry — same height,
                 same full width. Emphasis is carried by `variant` (colour), not
                 by size, so the stack reads as one set of choices.

                 The shared `md` action metric is the same 44px control used by
                 the Pro discovery CTA. It keeps these transaction actions aligned
                 with the rest of the marketplace instead of promoting them to the
                 48px page-level `lg` step. Every action stays on its own full-width
                 row: the desktop breakpoint describes the page, not the width of
                 this four-column sidebar, so two long translated labels cannot be
                 assumed to fit side by side here. */
              <div className="space-y-3" data-testid="listing-desktop-actions">
                {/* 1. Direct Online Purchase (Primary CTA if available) */}
                {actions.canDirectPurchase && (
                  <Button
                    data-marketplace-action="purchase.start"
                    variant={
                      actions.primaryAction === "direct_purchase"
                        ? "primary"
                        : "outline"
                    }
                    size="md"
                    fullWidth
                    onClick={() => setIsDirectPurchaseModalOpen(true)}
                    leftIcon={<ShieldCheck className="w-icon-lg h-icon-lg" />}
                    className="shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
                  >
                    Acheter maintenant
                  </Button>
                )}

                {/* 2. Reservation (Secondary or Primary CTA if available) */}
                {actions.canReserve && (
                  <Button
                    data-marketplace-action="reservation.start"
                    variant={
                      actions.primaryAction === "reservation"
                        ? "primary"
                        : "outline"
                    }
                    size="md"
                    fullWidth
                    onClick={() => setIsReservationModalOpen(true)}
                    leftIcon={
                      <Clock className="w-icon-lg h-icon-lg text-warning" />
                    }
                  >
                    {t("listings.listingDetailPage.reserverLArticle")}
                  </Button>
                )}

                <div className="grid grid-cols-1 gap-3 pt-1">
                  {/* 3. Price Negotiation Offer */}
                  {actions.canMakeOffer && (
                    <Button
                      data-marketplace-action="offer.create"
                      variant="outline"
                      size="md"
                      fullWidth
                      onClick={() => {
                        if (!currentUser) {
                          navigate(
                            routes.auth.login(
                              `${routes.listing.detail(listing.id)}?offer=1`,
                            ),
                          );
                          return;
                        }
                        setIsOfferModalOpen(true);
                      }}
                      leftIcon={
                        <DollarSign className="w-icon-md h-icon-md text-warning" />
                      }
                    >
                      {t("listings.listingDetailPage.offreDePrix")}
                    </Button>
                  )}

                  {/* 4. Direct Contact Message */}
                  {actions.canContact && (
                    <Button
                      data-marketplace-action="message.send"
                      variant={
                        actions.primaryAction === "contact"
                          ? "primary"
                          : "secondary"
                      }
                      size="md"
                      fullWidth
                      onClick={() => {
                        if (!currentUser) {
                          navigate(
                            routes.auth.login(
                              `${routes.listing.detail(listing.id)}?contact=1`,
                            ),
                          );
                          return;
                        }
                        setIsContactModalOpen(true);
                      }}
                      leftIcon={
                        <MessageSquare className="w-icon-md h-icon-md" />
                      }
                    >
                      {contactActionLabel}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SIMILAR LISTINGS RAIL */}
      {/* ========================================================================= */}
      {similarListings.length > 0 && (
        <div className="pt-8 border-t border-border-subtle space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-stone-900">
                Annonces similaires dans {displayCategoryLabel}
              </h2>
              <p className="text-xs text-stone-500">
                {t(
                  "listings.listingDetailPage.selectionDArticlesRecommandesSelon",
                )}
              </p>
            </div>

            <Link
              to={`/categorie/${listing.categorySlug}`}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span>{t("listings.listingDetailPage.voirTout")}</span>
              <ChevronRight className="w-icon-md h-icon-md" />
            </Link>
          </div>

          <ListingRail
            label={t("listings.listingDetailPage.annoncesSimilaires")}
          >
            {similarListings.map((simListing) => (
              <ListingCard key={simListing.id} listing={simListing} />
            ))}
          </ListingRail>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DIALOGS */}
      {/* ========================================================================= */}

      {/* 1. Direct Purchase Checkout Modal (Standalone, 0 reservation requirement) */}
      {isDirectPurchaseModalOpen && (
        <DirectPurchaseCheckoutModal
          isOpen={isDirectPurchaseModalOpen}
          onClose={() => setIsDirectPurchaseModalOpen(false)}
          listing={listing}
          onSuccess={() => {
            setListing((prev) => (prev ? { ...prev, status: "sold" } : null));
          }}
        />
      )}

      {/* 2. Reservation Modal */}
      {isReservationModalOpen && (
        <ReservationCheckoutModal
          isOpen={isReservationModalOpen}
          onClose={() => setIsReservationModalOpen(false)}
          listing={listing}
          currentUser={currentUser}
          onReservationComplete={(_tx: Transaction) => {
            setListing((prev) =>
              prev ? { ...prev, status: "reserved" } : null,
            );
            toast.success(
              "Réservation enregistrée. Consultez la commande pour suivre le paiement.",
            );
          }}
        />
      )}

      {/* 3. Contact Seller Modal */}
      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title={`Contacter ${seller?.name || listing.sellerName}`}
        description={`À propos de "${listing.title}" (${formatPrice(listing.price)})`}
      >
        <div className="space-y-4 text-xs">
          <FormField
            label={t("listings.listingDetailPage.votreMessage")}
            required
          >
            <Textarea
              rows={4}
              placeholder={t(
                "listings.listingDetailPage.bonjourVotreArticleMInteresse",
              )}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
          </FormField>

          <div className="flex gap-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setIsContactModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              data-marketplace-action="message.send"
              variant="primary"
              fullWidth
              onClick={handleSendMessage}
              leftIcon={<Send className="w-icon-md h-icon-md" />}
            >
              {t("listings.listingDetailPage.envoyerLeMessage")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 4. Price Offer Modal */}
      <Modal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        title={t("listings.listingDetailPage.faireUneOffreDePrix")}
        description={`Prix actuel : ${formatPrice(listing.price)}`}
      >
        <div className="space-y-4 text-xs">
          <FormField
            label={t("listings.listingDetailPage.montantDeVotreOffre")}
            required
          >
            <Input
              type="number"
              placeholder="ex: 120"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
            />
          </FormField>

          <div className="flex gap-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setIsOfferModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              data-marketplace-action="offer.create"
              variant="primary"
              fullWidth
              onClick={handleSendOffer}
            >
              Transmettre l'offre
            </Button>
          </div>
        </div>
      </Modal>

      {/* 5. Report Listing Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title={t("listings.listingDetailPage.signalerCetteAnnonce")}
        description={t("listings.listingDetailPage.aidezLEquipeDeModeration")}
      >
        <div className="space-y-4 text-xs">
          <FormField label={t("listings.listingDetailPage.motifDuSignalement")}>
            <DropdownMenu
              id="report-reason-select"
              ariaLabel="Motif du signalement"
              fullWidth
              headerTitle="Motif du signalement"
              options={[
                {
                  value: "suspicious",
                  label: "Tentative de fraude ou arnaque",
                },
                { value: "prohibited", label: "Article illégal ou interdit" },
                { value: "counterfeit", label: "Contrefaçon" },
                { value: "wrong_category", label: "Mauvaise catégorie" },
                { value: "other", label: "Autre motif" },
              ]}
              value={reportReason}
              onChange={(val) => setReportReason(val)}
            />
          </FormField>

          <FormField
            label={t("listings.listingDetailPage.precisionsComplementaires")}
          >
            <Textarea
              rows={3}
              placeholder={t(
                "listings.listingDetailPage.expliquezCeQuiVousSemble",
              )}
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
            />
          </FormField>

          <div className="flex gap-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setIsReportModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              data-marketplace-action="listing.report"
              variant="danger"
              fullWidth
              onClick={() => {
                setIsReportModalOpen(false);
                toast.success("Votre signalement a été transmis avec succès.");
              }}
            >
              {t("listings.listingDetailPage.envoyerLeSignalement")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* STICKY MOBILE ACTION BAR (< lg) */}
      {/* ========================================================================= */}
      {/* This bar stacks above the mobile tab bar, but the tab bar stops at `md`
          while the bar itself runs to `lg`. Between those two breakpoints it was
          still holding the tab bar's 57px offset, so it floated with a strip of
          page showing underneath it. It sits flush once there is nothing left to
          clear. */}
      {/* Mobile action bar.
          The action row used to be `shrink-0` beside a `min-w-0` price, on one
          line. With four actions resolved — offer, reserve, message, buy — that
          row measured 452px against a 393px viewport: the "Acheter" button hung
          59px off-screen and the price column was squeezed to 0px wide, so the
          primary purchase control and the amount were both unreachable.

          Below `sm` the two zones now stack and the actions share a two-column
          grid, which holds from 320px up for every combination the resolver can
          produce. From `sm` there is room for a single row again. */}
      <div
        ref={actionBarRef}
        className="lg:hidden fixed inset-x-0 bottom-mobile-nav-clearance md:bottom-0 bg-bg-surface/95 backdrop-blur-md border-t border-border-base p-3 sm:px-6 shadow-sticky z-sticky flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      >
        {/* The total is a full-width summary on phones, matching the action
            hierarchy: amount first, choices second, primary CTA last. */}
        <div className="flex items-baseline gap-3 min-w-0 sm:block sm:shrink-0">
          <div className="text-sm text-stone-500 font-bold uppercase tracking-wider shrink-0 sm:mb-0.5">
            {showsBuyerFee ? "Total à payer" : "Prix"}
          </div>
          <div className="text-2xl font-black text-stone-900 truncate tabular-nums leading-none">
            {listing.isFreeDonation
              ? "Don gratuit"
              : formatPrice(
                  showsBuyerFee ? listing.price + buyerFee : listing.price,
                )}
          </div>
        </div>

        <div
          data-testid="listing-mobile-actions"
          className={`grid gap-2 ${
            mobileActionCount > 1 ? "grid-cols-2" : "grid-cols-1"
          } sm:flex sm:items-center sm:justify-end sm:shrink-0`}
        >
          {actions.isOwner ? (
            <Button
              data-marketplace-action="listing.publish"
              to={routes.listing.publish({ edit: listing.id })}
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              leftIcon={<Edit3 className="w-icon-sm h-icon-sm" />}
            >
              Modifier
            </Button>
          ) : actions.statusNotice ? (
            <span className="text-xs font-bold text-warning bg-warning-surface px-3 py-1.5 rounded-lg text-center">
              {actions.statusNotice.title}
            </span>
          ) : (
            <>
              {actions.canMakeOffer && (
                <Button
                  data-marketplace-action="offer.create"
                  variant="outline"
                  size="md"
                  className={`w-full sm:w-auto ${mobileActionClass("offer")}`}
                  onClick={() => {
                    if (!currentUser) {
                      navigate(
                        routes.auth.login(
                          `${routes.listing.detail(listing.id)}?offer=1`,
                        ),
                      );
                      return;
                    }
                    setIsOfferModalOpen(true);
                  }}
                  leftIcon={
                    <DollarSign className="w-icon-sm h-icon-sm text-warning" />
                  }
                >
                  Offre
                </Button>
              )}
              {actions.canReserve && (
                <Button
                  data-marketplace-action="reservation.start"
                  variant={
                    actions.primaryAction === "reservation"
                      ? "primary"
                      : "outline"
                  }
                  size="md"
                  className={`w-full sm:w-auto ${mobileActionClass("reservation")}`}
                  onClick={() => setIsReservationModalOpen(true)}
                  leftIcon={
                    <Clock className="w-icon-sm h-icon-sm text-warning" />
                  }
                >
                  {t("listings.listingDetailPage.reserver")}
                </Button>
              )}
              {actions.canContact && (
                <Button
                  data-marketplace-action="message.send"
                  variant={
                    actions.primaryAction === "contact"
                      ? "primary"
                      : "secondary"
                  }
                  size="md"
                  className={`w-full sm:w-auto ${mobileActionClass("contact")}`}
                  onClick={() => {
                    if (!currentUser) {
                      navigate(
                        routes.auth.login(
                          `${routes.listing.detail(listing.id)}?contact=1`,
                        ),
                      );
                      return;
                    }
                    setIsContactModalOpen(true);
                  }}
                  leftIcon={<MessageSquare className="w-icon-sm h-icon-sm" />}
                >
                  {contactActionLabel}
                </Button>
              )}
              {actions.canDirectPurchase && (
                <Button
                  data-marketplace-action="purchase.start"
                  variant={
                    actions.primaryAction === "direct_purchase"
                      ? "primary"
                      : "outline"
                  }
                  size="md"
                  className={`w-full sm:w-auto ${mobileActionClass("direct_purchase")}`}
                  onClick={() => setIsDirectPurchaseModalOpen(true)}
                  leftIcon={<ShoppingBag className="w-icon-sm h-icon-sm" />}
                >
                  Acheter
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
