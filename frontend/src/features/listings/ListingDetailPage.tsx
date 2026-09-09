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
  Badge as SharedBadge,
  ProBadge,
  SemanticIcon,
  VerificationBadge,
} from "@shongre/ui/web";
import { DetailSection } from "../../design-system/primitives/DetailFacts";
import { ListingLocationSection } from "./components/ListingLocationSection";
import {
  Share2,
  Flag,
  MapPin,
  Clock,
  ShieldCheck,
  MessageSquare,
  DollarSign,
  CreditCard,
  Send,
  Edit3,
  Sliders,
  BellRing,
  UserPlus,
} from "lucide-react";
import { routes } from "../../configuration/routes";
import { services } from "../../api/client/service-registry";
import { Listing, PublicSellerProfile, Transaction } from "../../types";
import { listingActionsResolver } from "../../domains/listing/listing.actions";
import { useStaffMarketplaceAccess } from "../../security/useStaffMarketplaceAccess";
import { formatRelativeDate } from "../../utilities/formatters";
import {
  Breadcrumbs,
  FavoriteButton,
  PriceDisplay,
  SellerIdentityLink,
} from "../../design-system";
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
import { ListingDiscoveryRail } from "./components/ListingDiscoveryRail";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { useFavorites } from "../../app/providers/FavoritesProvider";
import { usePageMeta } from "../../hooks/usePageMeta";
import { analyticsService } from "../../services/analytics.service";
import { isProSeller } from "../../domains/user/user.domain";
import { DropdownMenu } from "../../design-system/primitives/DropdownMenu";
import { resolveListingIntentPresentation } from "../../domains/listing/listing-intent.presentation";
import { useTranslation } from "../../i18n/I18nProvider";
import { getListingCategoryLabel } from "../../domains/taxonomy/listing-category.display";
import { projectGenericListingCardView } from "../../domains/listing/listing-card.generic-presentation";
import type { WatchSubscription } from "@shongre/contracts/watch-subscriptions";
import type { ListingCharacteristicsData } from "../../api/contracts/listings.contract";
import { majorToMinorAmount } from "@shongre/shared/money";
import {
  getListingCapabilityPresentation,
  getListingPromotionBadges,
  getListingSellerRatingPresentation,
} from "@shongre/features/listings/presentation";
import { useListingPromotionRefresh } from "@shongre/features/listings/web";
import { publicListingUrl } from "../../domains/market/market-routing";
import { usePublicRouteData } from "../../app/providers/PublicRouteDataProvider";
import {
  pageMetaForPolicy,
  resolveSeoPolicy,
  structuredDataForPolicy,
} from "../../platform/seo/seo-policy";

const DirectPurchaseCheckoutModal = React.lazy(() =>
  import("../transactions/DirectPurchaseCheckoutModal").then((module) => ({
    default: module.DirectPurchaseCheckoutModal,
  })),
);
const ReservationCheckoutModal = React.lazy(() =>
  import("../transactions/components/ReservationCheckoutModal").then(
    (module) => ({ default: module.ReservationCheckoutModal }),
  ),
);
const ListingMediaGallery = React.lazy(() =>
  import("./components/ListingMediaGallery").then((module) => ({
    default: module.ListingMediaGallery,
  })),
);
const ListingCharacteristics = React.lazy(() =>
  import("./components/ListingCharacteristics").then((module) => ({
    default: module.ListingCharacteristics,
  })),
);
const ListingFulfillmentSummary = React.lazy(() =>
  import("./components/ListingFulfillmentSummary").then((module) => ({
    default: module.ListingFulfillmentSummary,
  })),
);
const ListingSellerTrustSection = React.lazy(() =>
  import("./components/ListingSellerTrustSection").then((module) => ({
    default: module.ListingSellerTrustSection,
  })),
);
const ListingSafetyNotice = React.lazy(() =>
  import("./components/ListingSafetyNotice").then((module) => ({
    default: module.ListingSafetyNotice,
  })),
);

const DetailSectionFallback = ({ gallery = false }: { gallery?: boolean }) => (
  <div
    aria-hidden="true"
    className={`skeleton-shimmer rounded-3xl border border-border-soft bg-bg-surface ${
      gallery ? "aspect-photo-gallery w-full" : "h-32"
    }`}
  />
);

function localizedTaxonomyLabel(
  labels: Readonly<Record<string, string | undefined>>,
  locale: string,
): string {
  return (
    labels[locale] ||
    labels[locale.split("-")[0]] ||
    labels["fr-FR"] ||
    Object.values(labels).find(Boolean) ||
    ""
  );
}

const PurchasePriceDisclosure: React.FC<{ listing: Listing }> = ({
  listing,
}) => {
  const { formatPrice } = useMarketLocation();
  const { t } = useTranslation();

  return (
    <div
      className="rounded-xl border border-border-subtle bg-bg-base/70 p-3"
      data-testid="purchase-price-disclosure"
    >
      <dl className="space-y-2 text-xs">
        <div className="flex items-center justify-between gap-3">
          <dt className="font-medium text-text-secondary">
            {t("listings.pricing.itemPrice")}
          </dt>
          <dd className="font-bold tabular-nums text-text-primary">
            {formatPrice(listing.price, {
              sourceCurrency: listing.currency,
            })}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="font-medium text-text-secondary">
            {t("listings.pricing.buyerProtection")}
          </dt>
          <dd className="max-w-44 text-right font-semibold text-text-primary">
            {t("listings.pricing.dependsOnFulfillment")}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="font-medium text-text-secondary">
            {t("listings.pricing.delivery")}
          </dt>
          <dd className="max-w-44 text-right font-semibold text-text-primary">
            {t("listings.pricing.dependsOnChoice")}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3 border-t border-border-subtle pt-2">
          <dt className="font-bold text-text-primary">
            {t("listings.pricing.total")}
          </dt>
          <dd className="max-w-44 text-right font-bold text-primary">
            {t("listings.pricing.confirmedBeforePayment")}
          </dd>
        </div>
      </dl>
    </div>
  );
};

export const ListingDetailPage: React.FC = () => {
  const {
    activeMarket,
    marketContext,
    currentLocale,
    convertMoney,
    formatPrice,
  } = useMarketLocation();
  const countryCode = marketContext?.countryCode ?? activeMarket.code;
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { isReadOnly: isReadOnlyStaff } = useStaffMarketplaceAccess();
  const toast = useToast();
  const {
    favoriteLoadState,
    isFavorite: isListingFavorite,
    refreshFavorites,
    toggleFavorite,
  } = useFavorites();
  const publicRouteData = usePublicRouteData();
  const initialData =
    publicRouteData?.kind === "listing" && publicRouteData.listing.id === id
      ? publicRouteData
      : null;

  const [listing, setListing] = useState<Listing | null>(
    initialData?.listing ?? null,
  );
  const [seller, setSeller] = useState<PublicSellerProfile | null>(
    initialData?.seller ?? null,
  );
  const [similarListings, setSimilarListings] = useState<Listing[]>(
    initialData?.similarListings ?? [],
  );
  const [sellerListings, setSellerListings] = useState<Listing[]>([]);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [characteristics, setCharacteristics] =
    useState<ListingCharacteristicsData | null>(null);
  const [characteristicsState, setCharacteristicsState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [characteristicsRetryKey, setCharacteristicsRetryKey] = useState(0);
  const [taxonomyRootLabel, setTaxonomyRootLabel] = useState("");
  const [taxonomySubLabel, setTaxonomySubLabel] = useState("");

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
  const inlineMobileActionRef = useRef<HTMLDivElement>(null);
  const inlineMobileActionSeenRef = useRef(false);
  const [showMobileStickyActions, setShowMobileStickyActions] = useState(false);
  const [watches, setWatches] = useState<WatchSubscription[]>([]);
  const [watchPending, setWatchPending] = useState<
    "listing_price" | "seller" | null
  >(null);
  const listingCardProjection = useMemo(
    () =>
      listing
        ? projectGenericListingCardView(
            listing,
            currentLocale,
            activeMarket.code,
            undefined,
            convertMoney,
          )
        : undefined,
    [activeMarket.code, convertMoney, currentLocale, listing],
  );
  useListingPromotionRefresh(listingCardProjection?.promotion);
  const activePromotionVisible = Boolean(
    listingCardProjection &&
    getListingPromotionBadges(
      listingCardProjection,
      t("ui.listingCard.boosted"),
    ).length > 0,
  );
  // One definition of where a seller's public page is, used by the identity
  // link beside the price and by the "see more" on the seller's rail.
  const sellerPublicUrlFor = (profile: PublicSellerProfile) =>
    routes.seller.publicPage({
      id: profile.id,
      slug: profile.slug,
      isProfessional: isProSeller(profile),
    });
  const listingCapabilities = listingCardProjection
    ? getListingCapabilityPresentation(listingCardProjection, {
        delivery: t("ui.listingCard.delivery"),
        digitalFulfillment: t("ui.listingCard.digitalFulfillment"),
        negotiable: t("ui.listingCard.negotiable"),
        onlinePayment: t("ui.listingCard.onlinePayment"),
        verifiedSeller: t("ui.listingCard.verifiedSeller"),
      })
    : [];
  const sellerRatingPresentation = getListingSellerRatingPresentation(
    listingCardProjection?.seller?.rating,
    listingCardProjection?.seller?.reviewCount,
    currentLocale,
  );
  const detailPhotoCount = listingCardProjection?.photoCount;

  /*
   * What else this seller has.
   *
   * Its own effect rather than a branch of the listing fetch: the page is
   * server-rendered for most visitors, and the fetch above returns early when
   * the server already supplied the listing — so a rail hung off it would have
   * appeared only for the minority who navigated in client-side.
   *
   * Filtered by the API. A seller rail is not a reason to download every
   * listing in the market and match ids in the browser.
   */
  const railSellerId = listing?.sellerId;
  const railListingId = listing?.id;
  useEffect(() => {
    if (!railSellerId || !railListingId) {
      setSellerListings([]);
      return;
    }
    let cancelled = false;
    services.listings
      .searchListings({
        marketCode: countryCode,
        sellerId: railSellerId,
        limit: PAGE_SIZES.similarListings,
      })
      .then((res) => {
        if (cancelled) return;
        setSellerListings(
          res.items.filter((row) => row.id !== railListingId).slice(0, 8),
        );
      })
      .catch(() => {
        if (!cancelled) setSellerListings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [countryCode, railListingId, railSellerId]);

  // 1. Data Fetching
  useEffect(() => {
    if (!id) return;
    if (initialData?.listing.id === id) {
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
    services.listings
      .getListingById(id)
      .then((item) => {
        if (item) {
          setListing(item);
          setSeller(item.sellerProfile ?? null);

          if (trackedListingId.current !== item.id) {
            trackedListingId.current = item.id;
            analyticsService.track("listing_viewed", {
              listingId: item.id,
              sellerId: item.sellerId,
              categoryId: item.categorySlug,
            });
          }

          // Load similar listings by category
          services.listings
            .getListings({
              marketCode: countryCode,
              categorySlug: item.subCategorySlug || item.categorySlug,
              limit: PAGE_SIZES.similarListings,
            })
            .then((res) => {
              setSimilarListings(
                res.listings.filter((l) => l.id !== item.id).slice(0, 4),
              );
            })
            .catch(() => setSimilarListings([]));
        }
      })
      .catch(() => setListing(null))
      .finally(() => setIsLoading(false));
  }, [countryCode, id, initialData]);

  const characteristicsListingId = listing?.id;
  const categorySlug = listing?.categorySlug;
  const subCategorySlug = listing?.subCategorySlug;

  useEffect(() => {
    let active = true;
    setTaxonomyRootLabel("");
    setTaxonomySubLabel("");
    const loadLabel = async (
      identity: string | undefined,
      setLabel: (value: string) => void,
    ) => {
      if (!identity) return;
      try {
        const node = await services.taxonomy.getNodeById(identity);
        if (active && node)
          setLabel(
            localizedTaxonomyLabel(node.shortLabels ?? {}, currentLocale) ||
              localizedTaxonomyLabel(node.labels ?? {}, currentLocale) ||
              node.name,
          );
      } catch {
        // Listing-projected category labels remain usable if navigation is unavailable.
      }
    };
    void loadLabel(categorySlug, setTaxonomyRootLabel);
    void loadLabel(subCategorySlug, setTaxonomySubLabel);
    return () => {
      active = false;
    };
  }, [categorySlug, subCategorySlug, countryCode, currentLocale]);

  useEffect(() => {
    let active = true;
    setCharacteristics(null);
    setCharacteristicsState("loading");
    if (!characteristicsListingId || !countryCode)
      return () => {
        active = false;
      };
    void services.listings
      .getCharacteristics(characteristicsListingId, countryCode, currentLocale)
      .then((data) => {
        if (!active) return;
        setCharacteristics(data);
        setCharacteristicsState("ready");
      })
      .catch(() => {
        if (!active) return;
        setCharacteristicsState("error");
      });
    return () => {
      active = false;
    };
  }, [
    characteristicsListingId,
    countryCode,
    currentLocale,
    characteristicsRetryKey,
  ]);

  const displayCategoryLabel = listing
    ? taxonomyRootLabel || getListingCategoryLabel(listing, currentLocale)
    : "";
  const displaySubCategoryLabel = listing
    ? taxonomySubLabel || listing.subCategoryLabel.trim()
    : "";

  // An absent public capability is never inferred from taxonomy, seller type,
  // price, or browser configuration. The listing API is the source of truth.
  const transactionCaps = useMemo(() => {
    if (!listing)
      return {
        canContact: true,
        canDirectPurchase: false,
        canReserve: false,
        defaultModes: ["CONTACT_ONLY" as const],
      };
    const canDirectPurchase = listing.isOnlinePaymentAvailable === true;
    const canReserve = listing.isReservable === true;
    return {
      canContact: true,
      canDirectPurchase,
      canReserve,
      defaultModes: [
        "CONTACT_ONLY" as const,
        ...(canDirectPurchase ? (["DIRECT_PURCHASE"] as const) : []),
        ...(canReserve ? (["RESERVATION"] as const) : []),
      ],
    };
  }, [listing]);

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
    });
  }, [listing, currentUser, seller, transactionCaps]);

  const contactActionLabel = t("listings.listingDetailPage.message");

  const intentPresentation = useMemo(
    () =>
      resolveListingIntentPresentation(
        undefined,
        Boolean(listing?.isOnlinePaymentAvailable),
      ),
    [listing?.isOnlinePaymentAvailable],
  );

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

  useEffect(() => {
    const node = inlineMobileActionRef.current;
    inlineMobileActionSeenRef.current = false;
    setShowMobileStickyActions(false);
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          inlineMobileActionSeenRef.current = true;
          setShowMobileStickyActions(false);
        } else if (inlineMobileActionSeenRef.current) {
          setShowMobileStickyActions(true);
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [listing?.id]);

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

  const summaryAttributes = listingCardProjection?.characteristics ?? [];

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

  useEffect(() => {
    let active = true;
    if (!currentUser || !listing || actions.isOwner || isReadOnlyStaff) {
      setWatches([]);
      return () => {
        active = false;
      };
    }
    void services.watchSubscriptions
      .list(currentUser.id, activeMarket.code)
      .then((items) => {
        if (active) setWatches(items);
      })
      .catch(() => {
        if (active) setWatches([]);
      });
    return () => {
      active = false;
    };
  }, [
    actions.isOwner,
    activeMarket.code,
    currentUser,
    isReadOnlyStaff,
    listing,
  ]);

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

  const toggleWatch = async (targetType: "listing_price" | "seller") => {
    if (!listing) return;
    const listingCurrency = listing.currency || activeMarket.currency;
    if (!currentUser) {
      navigate(routes.auth.login(routes.listing.detail(listing.id)));
      return;
    }
    const targetId =
      targetType === "listing_price" ? listing.id : listing.sellerId;
    const existing = watches.find(
      (item) => item.targetType === targetType && item.targetId === targetId,
    );
    setWatchPending(targetType);
    try {
      if (existing) {
        await services.watchSubscriptions.remove(
          currentUser.id,
          activeMarket.code,
          existing.id,
        );
        setWatches((items) => items.filter((item) => item.id !== existing.id));
        toast.info(t("watch.listing.removed"));
      } else {
        const created = await services.watchSubscriptions.createOrReplace(
          currentUser.id,
          {
            marketCode: activeMarket.code,
            targetType,
            targetId,
            title:
              targetType === "listing_price"
                ? listing.title
                : seller?.name || listing.sellerName,
            frequency: targetType === "listing_price" ? "immediate" : "daily",
            channels: { inApp: true, email: false, push: true },
            ...(targetType === "listing_price"
              ? {
                  baselinePrice: {
                    amountMinor: majorToMinorAmount(
                      listing.price,
                      listingCurrency,
                    ),
                    currency: listingCurrency,
                  },
                }
              : {}),
          },
        );
        setWatches((items) => [
          created,
          ...items.filter((item) => item.id !== created.id),
        ]);
        toast.success(t("watch.listing.created"));
      }
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : t("watch.save.error"),
      );
    } finally {
      setWatchPending(null);
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
      initialMessage: `Proposition d'offre de prix : ${formatPrice(numPrice, { sourceCurrency: listing.currency })} (Prix initial : ${formatPrice(listing.price, { sourceCurrency: listing.currency })})`,
    });

    await services.messaging.makeOffer(conv.id, buyerId, buyerName, numPrice);

    setIsOfferModalOpen(false);
    setOfferPrice("");
    toast.success(
      `Votre offre de ${formatPrice(numPrice, { sourceCurrency: listing.currency })} a été transmise au vendeur.`,
    );
    navigate(routes.workspace.messages(conv.id));
  };

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
        <div className="h-4 bg-surface-disabled rounded w-1/4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="aspect-16/10 bg-surface-disabled rounded-2xl" />
            <div className="h-8 bg-surface-disabled rounded w-3/4" />
            <div className="h-32 bg-surface-disabled rounded-2xl" />
          </div>
          <div className="h-80 bg-surface-disabled rounded-2xl" />
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
  const inlineMobilePrimaryAction = actions.isOwner ? (
    <Button
      data-marketplace-action="listing.publish"
      to={routes.listing.publish({ edit: listing.id })}
      variant="primary"
      size="md"
      fullWidth
      leftIcon={<Edit3 className="h-icon-sm w-icon-sm" />}
    >
      {t("listings.listingDetailPage.modifierMonAnnonce")}
    </Button>
  ) : actions.statusNotice ? (
    <span className="block rounded-lg bg-warning-surface px-3 py-2 text-center text-xs font-bold text-warning">
      {actions.statusNotice.title}
    </span>
  ) : actions.canDirectPurchase &&
    actions.primaryAction === "direct_purchase" ? (
    <Button
      data-marketplace-action="purchase.start"
      variant="primary"
      size="md"
      fullWidth
      onClick={() => setIsDirectPurchaseModalOpen(true)}
      leftIcon={<CreditCard className="h-icon-sm w-icon-sm" />}
    >
      {t("listings.listingDetailPage.acheterMaintenant")}
    </Button>
  ) : actions.canReserve && actions.primaryAction === "reservation" ? (
    <Button
      data-marketplace-action="reservation.start"
      variant="primary"
      size="md"
      fullWidth
      onClick={() => setIsReservationModalOpen(true)}
      leftIcon={<Clock className="h-icon-sm w-icon-sm" />}
    >
      {t("listings.listingDetailPage.reserverLArticle")}
    </Button>
  ) : actions.canContact ? (
    <Button
      data-marketplace-action="message.send"
      variant="primary"
      size="md"
      fullWidth
      onClick={() => {
        if (!currentUser) {
          navigate(
            routes.auth.login(`${routes.listing.detail(listing.id)}?contact=1`),
          );
          return;
        }
        setIsContactModalOpen(true);
      }}
      leftIcon={<MessageSquare className="h-icon-sm w-icon-sm" />}
    >
      {contactActionLabel}
    </Button>
  ) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32 lg:pb-6 space-y-6">
      {/* Top Bar: Breadcrumbs & Secondary Tools */}
      <div
        data-testid="listing-detail-toolbar"
        className="grid grid-cols-content-action items-center gap-2 sm:gap-4"
      >
        <Breadcrumbs items={breadcrumbItems} />

        <div
          data-testid="listing-detail-secondary-actions"
          className="flex shrink-0 items-center gap-2"
        >
          <button
            type="button"
            onClick={handleShare}
            aria-label={t("listings.listingDetailPage.partagerLAnnonce")}
            className="flex items-center gap-1.5 text-xs font-semibold text-text-supporting hover:text-text-main bg-bg-surface border border-border-base px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            <Share2 className="w-icon-sm h-icon-sm" />
            <span className="hidden sm:inline">Partager</span>
          </button>
          <button
            type="button"
            data-marketplace-action="listing.report"
            onClick={() => setIsReportModalOpen(true)}
            aria-label={t("listings.listingDetailPage.signalerCetteAnnonce")}
            className="flex items-center gap-1.5 text-xs font-semibold text-text-tertiary hover:text-danger bg-bg-surface border border-border-base px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
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
          {/* 1. MEDIA GALLERY — let buyers inspect the item before its details. */}
          <React.Suspense fallback={<DetailSectionFallback gallery />}>
            <ListingMediaGallery
              photos={listing.photos}
              title={listing.title}
              overlayActions={
                <FavoriteButton
                  isFavorite={isListingFavorite(listing.id)}
                  interactionState={favoriteLoadState}
                  label={`${
                    favoriteLoadState === "loading"
                      ? t("ui.listingCard.favorisChargement")
                      : favoriteLoadState === "error"
                        ? t("ui.listingCard.favorisReessayer")
                        : t(
                            isListingFavorite(listing.id)
                              ? "ui.listingCard.retirerDesFavoris"
                              : "ui.listingCard.ajouterAuxFavoris",
                          )
                  } : ${listing.title}`}
                  onToggle={handleFavoriteToggle}
                  onRetry={async () => {
                    try {
                      await refreshFavorites();
                    } catch {
                      toast.error(t("ui.listingCard.favorisChargementErreur"));
                    }
                  }}
                  size="md"
                  variant="floating"
                />
              }
            />
          </React.Suspense>

          {/* 2. PRIMARY SUMMARY CARD */}
          <div className="bg-bg-surface rounded-3xl border border-border-disabled/60 p-6 sm:p-8 space-y-5 shadow-sm relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-surface-soft rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start gap-4 relative z-raised">
              <div className="space-y-2 flex-1">
                {/* Badges strip: Category, Pro, Boosted */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Badge variant="primary" size="md">
                    {displayCategoryLabel}
                  </Badge>
                  {isProSeller(listing) && (
                    <ProBadge
                      size="md"
                      label={t("ui.identityStatus.pro.short")}
                      accessibilityLabel={t("ui.identityStatus.pro.seller")}
                    />
                  )}
                  {activePromotionVisible && (
                    <Badge
                      variant={
                        listingCardProjection?.promotion?.type ===
                          "urgent_badge" ||
                        listingCardProjection?.discovery?.promotionType ===
                          "urgent_badge"
                          ? "urgent"
                          : "featured"
                      }
                      size="md"
                      icon
                    >
                      {listingCardProjection?.promotion?.label ||
                        t("ui.listingCard.boosted")}
                    </Badge>
                  )}
                </div>

                {/* Main H1 Title */}
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-main leading-tight tracking-tight">
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
                    className="inline-flex items-center px-3.5 py-2 rounded-xl bg-surface-soft text-xs font-bold text-text-emphasis border border-border-disabled/60"
                  >
                    {attrText}
                  </span>
                ))}
              </div>
            )}

            {listingCapabilities.length > 0 ||
            sellerRatingPresentation ||
            (detailPhotoCount !== undefined && detailPhotoCount > 0) ? (
              <div
                data-testid="listing-detail-capabilities"
                className="space-y-2 border-t border-border-soft pt-4"
              >
                <p className="text-micro font-bold uppercase tracking-wider text-text-tertiary">
                  {t("listings.listingDetailPage.servicesAndInformation")}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {listingCapabilities.map((capability) =>
                    capability.kind === "verified_seller" ? (
                      <VerificationBadge
                        key={capability.kind}
                        label={capability.label}
                        accessibilityLabel={capability.label}
                        size="md"
                      />
                    ) : (
                      <SharedBadge
                        key={capability.kind}
                        data-listing-capability={capability.kind}
                        variant="neutral"
                        size="md"
                        icon={<SemanticIcon name={capability.icon} size="sm" />}
                        className="rounded-pill"
                      >
                        {capability.label}
                      </SharedBadge>
                    ),
                  )}
                  {sellerRatingPresentation ? (
                    <SharedBadge
                      data-listing-detail-rating="true"
                      variant="neutral"
                      size="md"
                      icon={
                        <SemanticIcon
                          name="star"
                          size="sm"
                          className="fill-primary text-primary"
                        />
                      }
                      className="rounded-pill"
                    >
                      {t("listings.listingDetailPage.ratingSummary")
                        .replace("{rating}", sellerRatingPresentation.rating)
                        .replace(
                          "{count}",
                          sellerRatingPresentation.reviewCount,
                        )}
                    </SharedBadge>
                  ) : null}
                  {detailPhotoCount !== undefined && detailPhotoCount > 0 ? (
                    <SharedBadge
                      data-listing-detail-photo-count="true"
                      variant="neutral"
                      size="md"
                      icon={<SemanticIcon name="camera" size="sm" />}
                      className="rounded-pill"
                    >
                      {t("ui.listingCard.photos", {
                        count: detailPhotoCount,
                      })}
                    </SharedBadge>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div
              ref={inlineMobileActionRef}
              className="space-y-3 pt-3 lg:hidden"
              data-testid="listing-inline-mobile-action"
            >
              {!actions.isOwner && actions.canDirectPurchase ? (
                <PurchasePriceDisclosure listing={listing} />
              ) : null}
              {inlineMobilePrimaryAction}
            </div>

            {/* Metadata Footer: Location, Publication Date */}
            <div className="flex items-center gap-4 text-xs font-medium text-text-tertiary pt-5 mt-2 border-t border-border-soft flex-wrap">
              {listing.requiresPhysicalDelivery !== false ? (
                <span className="flex items-center gap-1.5 text-text-emphasis">
                  <MapPin className="w-icon-md h-icon-md text-primary" />
                  {listing.city} ({listing.postalCode})
                </span>
              ) : (
                <Badge variant="primary">
                  {t("digital.common.noShipping")}
                </Badge>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="w-icon-md h-icon-md text-text-inverse-subtle" />
                Publiée {formatRelativeDate(listing.createdAt)}
              </span>
            </div>
          </div>

          {/* 3. GROUPED TECHNICAL CHARACTERISTICS */}
          <React.Suspense fallback={<DetailSectionFallback />}>
            <ListingCharacteristics
              data={characteristics}
              state={characteristicsState}
              onRetry={() =>
                setCharacteristicsRetryKey((current) => current + 1)
              }
            />
          </React.Suspense>

          {/* 4. DESCRIPTION */}
          <DetailSection title="Description">
            <div
              className={`whitespace-pre-line text-sm leading-loose text-text-supporting ${
                !isDescriptionExpanded && listing.description.length > 450
                  ? "relative line-clamp-6"
                  : ""
              }`}
            >
              {listing.description}
              {!isDescriptionExpanded && listing.description.length > 450 && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-bg-surface to-transparent" />
              )}
            </div>

            {listing.description.length > 450 && (
              <button
                type="button"
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="mt-4 inline-flex min-h-control-target cursor-pointer items-center font-bold text-text-main underline underline-offset-4 transition-colors hover:text-primary"
              >
                {isDescriptionExpanded ? "Afficher moins" : "Voir plus"}
              </button>
            )}
          </DetailSection>

          {/* 4b. LOCALISATION */}
          <ListingLocationSection
            marketCode={listing.marketCode}
            city={listing.city}
            postalCode={listing.postalCode}
            latitude={listing.latitude}
            longitude={listing.longitude}
          />

          {/* 5. FULFILLMENT & DELIVERY SUMMARY */}
          <React.Suspense fallback={<DetailSectionFallback />}>
            <ListingFulfillmentSummary listing={listing} />
          </React.Suspense>

          {/* 6. COMPACT SELLER IDENTITY & TRUST */}
          {seller && (
            <React.Suspense fallback={<DetailSectionFallback />}>
              <ListingSellerTrustSection seller={seller} reviews={[]} />
            </React.Suspense>
          )}

          {/* 7. SAFETY REASSURANCE NOTICE */}
          <React.Suspense fallback={<DetailSectionFallback />}>
            <ListingSafetyNotice variant={intentPresentation.safetyVariant} />
          </React.Suspense>

          {/* 8. LISTING BOTTOM METADATA */}
          <div className="p-4 rounded-xl bg-bg-base/60 text-micro text-text-tertiary flex items-center justify-between flex-wrap gap-2 border border-border-subtle">
            <span>
              {t("listings.listingDetailPage.referenceAnnonce")}{" "}
              <strong className="font-mono text-text-emphasis">
                {listing.id}
              </strong>
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
          <div className="bg-bg-surface rounded-3xl border border-border-disabled/60 p-6 sm:p-8 space-y-6 shadow-md sticky top-24">
            {/* The authoritative fee total is disclosed after the buyer chooses
                a delivery method and the orders API returns its quote. */}
            <div className="space-y-1">
              <span className="text-xs text-text-tertiary font-bold uppercase tracking-wider block">
                {t(intentPresentation.priceLabelKey)}
              </span>
              <PriceDisplay
                price={listing.price}
                originalPrice={listing.originalPrice}
                isNegotiable={listing.isNegotiable}
                isFreeDonation={listing.isFreeDonation}
                size="xl"
              />
              {listing.isOnlinePaymentAvailable && listing.price > 0 && (
                <p className="flex items-center gap-1.5 text-xs text-text-tertiary pt-1.5">
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
              <SellerIdentityLink
                to={sellerPublicUrlFor(seller)}
                name={seller.name}
                avatarUrl={seller.avatarUrl}
                isVerified={seller.isVerified}
                isProfessional={isProSeller(seller)}
                rating={seller.rating}
                reviewCount={seller.reviewCount}
                locationLabel={seller.city || seller.country}
                surface="subtle"
              />
            )}

            {!actions.isOwner && !isReadOnlyStaff ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  variant={
                    watches.some(
                      (item) =>
                        item.targetType === "listing_price" &&
                        item.targetId === listing.id,
                    )
                      ? "secondary"
                      : "outline"
                  }
                  size="sm"
                  disabled={watchPending !== null}
                  leftIcon={<BellRing className="h-icon-sm w-icon-sm" />}
                  onClick={() => void toggleWatch("listing_price")}
                >
                  {watches.some(
                    (item) =>
                      item.targetType === "listing_price" &&
                      item.targetId === listing.id,
                  )
                    ? t("watch.listing.priceActive")
                    : t("watch.listing.priceAction")}
                </Button>
                <Button
                  variant={
                    watches.some(
                      (item) =>
                        item.targetType === "seller" &&
                        item.targetId === listing.sellerId,
                    )
                      ? "secondary"
                      : "outline"
                  }
                  size="sm"
                  disabled={watchPending !== null}
                  leftIcon={<UserPlus className="h-icon-sm w-icon-sm" />}
                  onClick={() => void toggleWatch("seller")}
                >
                  {watches.some(
                    (item) =>
                      item.targetType === "seller" &&
                      item.targetId === listing.sellerId,
                  )
                    ? t("watch.listing.sellerActive")
                    : t("watch.listing.sellerAction")}
                </Button>
              </div>
            ) : null}

            {!actions.isOwner && actions.canDirectPurchase ? (
              <PurchasePriceDisclosure listing={listing} />
            ) : null}

            {/* ===================================================================== */}
            {/* OWNER ACTIONS vs BUYER ACTIONS */}
            {/* ===================================================================== */}
            {actions.isOwner ? (
              <div className="p-5 bg-primary-surface-soft border border-primary-border rounded-2xl space-y-4">
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
                    leftIcon={<CreditCard className="h-icon-lg w-icon-lg" />}
                    className="shadow-md shadow-primary-shadow hover:shadow-lg hover:shadow-primary-shadow-strong"
                  >
                    {t("listings.listingDetailPage.acheterMaintenant")}
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
      {/* DISCOVERY RAILS — what else this seller has, what else is like this */}
      {/* ========================================================================= */}
      <div className="space-y-7 pt-8">
        <ListingDiscoveryRail
          kind="seller"
          title={t(
            seller?.sellerType === "pro"
              ? "listings.discovery.fromThisPro"
              : "listings.discovery.fromThisSeller",
          )}
          subtitle={t("listings.discovery.fromThisSellerSubtitle")}
          moreHref={seller ? sellerPublicUrlFor(seller) : undefined}
          moreLabel={t("listings.discovery.seeMoreFromSeller")}
        >
          {sellerListings.map((row) => (
            <ListingCard key={row.id} listing={row} />
          ))}
        </ListingDiscoveryRail>

        <ListingDiscoveryRail
          kind="similar"
          title={t("listings.discovery.similar")}
          subtitle={
            displayCategoryLabel
              ? t("listings.discovery.similarSubtitle", {
                  category: displayCategoryLabel,
                })
              : t("listings.discovery.similarSubtitleGeneric")
          }
          moreHref={`/categorie/${listing.categorySlug}`}
          moreLabel={t("listings.discovery.seeAllInCategory")}
        >
          {similarListings.map((simListing) => (
            <ListingCard key={simListing.id} listing={simListing} />
          ))}
        </ListingDiscoveryRail>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DIALOGS */}
      {/* ========================================================================= */}

      <React.Suspense fallback={null}>
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
      </React.Suspense>

      {/* 3. Contact Seller Modal */}
      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title={`Contacter ${seller?.name || listing.sellerName}`}
        description={`À propos de "${listing.title}" (${formatPrice(listing.price, { sourceCurrency: listing.currency })})`}
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
        description={`Prix actuel : ${formatPrice(listing.price, { sourceCurrency: listing.currency })}`}
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
      {showMobileStickyActions ? (
        <div
          ref={actionBarRef}
          className="lg:hidden fixed inset-x-0 bottom-mobile-nav-clearance md:bottom-0 bg-bg-surface/95 backdrop-blur-md border-t border-border-base p-3 sm:px-6 shadow-sticky z-sticky flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          {/* The total is a full-width summary on phones, matching the action
            hierarchy: amount first, choices second, primary CTA last. */}
          <div className="flex items-baseline gap-3 min-w-0 sm:block sm:shrink-0">
            <div className="text-sm text-text-tertiary font-bold uppercase tracking-wider shrink-0 sm:mb-0.5">
              {t("listings.pricing.itemPrice")}
            </div>
            <div className="text-2xl font-bold text-text-main truncate tabular-nums leading-none">
              {listing.isFreeDonation
                ? "Don gratuit"
                : formatPrice(listing.price, {
                    sourceCurrency: listing.currency,
                  })}
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
                    leftIcon={<CreditCard className="h-icon-sm w-icon-sm" />}
                  >
                    Acheter
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
