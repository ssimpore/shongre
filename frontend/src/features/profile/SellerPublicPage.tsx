import { routes } from "../../configuration/routes";
import { isProSeller } from "../../domains/user/user.domain";
import { usePageMeta } from "../../hooks/usePageMeta";
import React, { useState, useEffect } from "react";
import {
  useParams,
  useNavigate,
  useSearchParams,
  useLocation,
  Link,
} from "react-router-dom";
import {
  ChevronRight,
  Home,
  Search,
  Package,
  Star,
  AlertCircle,
} from "lucide-react";
import { PublicSellerProfile, Listing, ReviewItem } from "../../types";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { SellerProfileHeader } from "./components/SellerProfileHeader";
import { SellerTrustIndicators } from "./components/SellerTrustIndicators";
import { SellerCatalog } from "./components/SellerCatalog";
import { SellerReviewsTab } from "./components/SellerReviewsTab";
import { SellerReportModal } from "./components/SellerReportModal";
import { Button } from "../../design-system/primitives/Button";
import { Tabs, TabPanel } from "../../design-system";
import { useTranslation } from "../../i18n/I18nProvider";
import { usePublicRouteData } from "../../app/providers/PublicRouteDataProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import {
  pageMetaForPolicy,
  resolveSeoPolicy,
  structuredDataForPolicy,
} from "../../platform/seo/seo-policy";

export const SellerPublicPage: React.FC = () => {
  const { t } = useTranslation();
  const { slug, sellerSlug } = useParams<{
    slug?: string;
    sellerSlug?: string;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { marketContext, activeMarket } = useMarketLocation();

  const activeSlug = slug || sellerSlug || "";
  const publicRouteData = usePublicRouteData();
  const initialData =
    publicRouteData?.kind === "seller" &&
    [publicRouteData.seller.slug, publicRouteData.seller.id].includes(
      activeSlug,
    )
      ? publicRouteData
      : null;

  const [seller, setSeller] = useState<PublicSellerProfile | null>(
    initialData?.seller ?? null,
  );
  const [listings, setListings] = useState<Listing[]>(
    initialData?.listings ?? [],
  );
  const [reviews, setReviews] = useState<ReviewItem[]>(
    initialData?.reviews ?? [],
  );
  const [isLoading, setIsLoading] = useState(!initialData);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportedReview, setReportedReview] = useState<ReviewItem | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState(false);
  const [reviewAttempt, setReviewAttempt] = useState(0);
  const sellerId = seller?.id;

  useEffect(() => {
    if (!sellerId) return;
    let active = true;
    setReviewsLoading(true);
    setReviewsError(false);
    services.reviews
      .getUserReviews(sellerId)
      .then((result) => {
        if (active) setReviews(result);
      })
      .catch(() => {
        if (active) setReviewsError(true);
      })
      .finally(() => {
        if (active) setReviewsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sellerId, reviewAttempt]);

  // Tab management: catalog | reviews | about
  const tabFromUrl = searchParams.get("tab") as
    "catalog" | "reviews" | "about" | null;
  const [activeTab, setActiveTab] = useState<"catalog" | "reviews" | "about">(
    tabFromUrl || "catalog",
  );

  useEffect(() => {
    if (tabFromUrl && ["catalog", "reviews", "about"].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (newTab: "catalog" | "reviews" | "about") => {
    setActiveTab(newTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newTab === "catalog") {
        next.delete("tab");
      } else {
        next.set("tab", newTab);
      }
      return next;
    });
  };

  useEffect(() => {
    if (initialData) {
      setIsLoading(false);
      return;
    }
    const fetchProfileData = async () => {
      setIsLoading(true);
      try {
        const foundSeller = await services.users.getPublicProfile(activeSlug);
        if (foundSeller) {
          setSeller(foundSeller);
          /*
           * Filtered by the API. This used to read every listing in the market
           * and keep the ones whose sellerId matched — a full discovery page
           * downloaded to render one seller's shelf, and a page whose contents
           * silently truncated as soon as the market outgrew the default page
           * size.
           */
          const result = await services.listings.searchListings({
            marketCode: activeMarket.code,
            sellerId: foundSeller.id,
          });
          setListings(result.items);
        } else {
          setSeller(null);
        }
      } catch {
        setSeller(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [activeMarket.code, activeSlug, initialData]);

  const handleContactClick = () => {
    if (!seller) return;
    navigate(
      `/messages?sellerId=${seller.id}&sellerName=${encodeURIComponent(seller.name)}`,
    );
  };

  // 1. Loading Skeleton
  /* Declared above the loading and not-found returns, because hooks cannot run
     after a conditional return — and because the not-found case needs metadata
     of its own rather than whatever the previous route left in the tab. */
  const pageMeta = React.useMemo(() => {
    if (!seller || !marketContext) {
      return {
        title: isLoading ? "Chargement du profil" : "Profil introuvable",
        noIndex: true,
        follow: false,
      };
    }
    const routeData = {
      status: "found" as const,
      data: {
        kind: "seller" as const,
        seller,
        listings,
        reviews,
      },
    };
    const segment =
      ["boutique", "profil", "vendeur", "u"].find((value) =>
        location.pathname.split("/").includes(value),
      ) || "profil";
    const policy = resolveSeoPolicy({
      pathname: `/${segment}/${activeSlug}`,
      marketContext,
      routeData,
    });
    return pageMetaForPolicy(
      policy,
      structuredDataForPolicy(policy, marketContext, routeData),
    );
  }, [
    activeSlug,
    isLoading,
    listings,
    location.pathname,
    marketContext,
    reviews,
    seller,
  ]);
  usePageMeta(pageMeta);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
        <div className="h-6 w-48 bg-surface-disabled rounded-md" />
        <div className="h-64 bg-surface-disabled rounded-2xl" />
        <div className="h-24 bg-surface-disabled rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-72 bg-surface-disabled rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // 2. User Not Found (404)
  if (!seller) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-warning-surface border border-warning-border text-warning flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        {/* The page heading, not a section heading: this *is* the page in
            this state. Rendered as an H2 it left the route with no H1 at
            all, so the document outline started at level 2 and a screen
            reader jumping by heading found nothing to land on. */}
        <h1 className="text-2xl font-bold text-text-main mb-2">
          Profil introuvable
        </h1>
        <p className="text-sm text-text-tertiary max-w-md mx-auto mb-6">
          {t("profile.sellerPublicPage.lUtilisateurOuLaBoutique")}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            to={routes.home()}
            variant="outline"
            size="md"
            leftIcon={<Home className="w-icon-md h-icon-md" />}
          >
            {t("profile.sellerPublicPage.retourALAccueil")}
          </Button>
          <Button
            to={routes.search()}
            variant="primary"
            size="md"
            leftIcon={<Search className="w-icon-md h-icon-md" />}
          >
            {t("profile.sellerPublicPage.rechercherDesAnnonces")}
          </Button>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === seller.id;
  const isPro = isProSeller(seller);
  const activeListingsCount = listings.filter(
    (l) => l.status === "active",
  ).length;
  const displayName = seller.name;

  return (
    <div className="min-h-screen bg-bg-base pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Fil d'Ariane"
          className="flex items-center gap-1.5 text-xs text-text-tertiary"
        >
          <Link
            to={routes.home()}
            className="hover:text-text-main flex items-center gap-1"
          >
            <Home className="w-icon-sm h-icon-sm" />
            <span>Accueil</span>
          </Link>
          <ChevronRight className="w-icon-xs h-icon-xs text-text-inverse-subtle" />
          {isPro ? (
            <>
              <Link to="/solutions-pro" className="hover:text-text-main">
                Boutiques Pro
              </Link>
              <ChevronRight className="w-icon-xs h-icon-xs text-text-inverse-subtle" />
            </>
          ) : (
            <>
              <span className="text-text-tertiary">Profils</span>
              <ChevronRight className="w-icon-xs h-icon-xs text-text-inverse-subtle" />
            </>
          )}
          <span className="text-text-main font-bold truncate max-w-50">
            {displayName}
          </span>
        </nav>

        {/* 1. Header Profile Banner */}
        <SellerProfileHeader
          seller={seller}
          activeListingsCount={activeListingsCount}
          onTabChange={handleTabChange}
          isOwnProfile={isOwnProfile}
          onContactClick={handleContactClick}
          onOpenReportModal={() => setIsReportModalOpen(true)}
        />

        {/* 2. Trust Indicators Bar */}
        <SellerTrustIndicators seller={seller} />

        {/* 3. Navigation Tabs */}
        <Tabs
          label={t("profile.sellerPublicPage.sectionsDuProfilVendeur")}
          idPrefix="seller"
          activeTab={activeTab}
          onChange={(tab) => handleTabChange(tab as typeof activeTab)}
          tabs={[
            {
              id: "catalog",
              label: "Annonces en ligne",
              count: activeListingsCount,
              icon: <Package className="w-icon-md h-icon-md" />,
            },
            {
              id: "reviews",
              label: "Avis vérifiés",
              count: reviews.length,
              icon: <Star className="w-icon-md h-icon-md" />,
            },
          ]}
        />

        {/* 4. Tab Content */}
        <TabPanel tab={activeTab} idPrefix="seller">
          {activeTab === "catalog" && (
            <SellerCatalog
              listings={listings}
              seller={seller}
              isOwnProfile={isOwnProfile}
            />
          )}

          {activeTab === "reviews" &&
            (reviewsLoading ? (
              <p role="status">{t("reviews.loading")}</p>
            ) : reviewsError ? (
              <div role="alert" className="space-y-3">
                <p>{t("reviews.loadError")}</p>
                <Button
                  variant="outline"
                  onClick={() => setReviewAttempt((value) => value + 1)}
                >
                  {t("common.retry")}
                </Button>
              </div>
            ) : (
              <SellerReviewsTab
                reviews={reviews}
                onReport={(review) => {
                  if (!currentUser) {
                    navigate(
                      routes.auth.login(location.pathname + location.search),
                    );
                    return;
                  }
                  setReportedReview(review);
                }}
              />
            ))}
        </TabPanel>
      </div>

      {/* Safety Report Modal */}
      {reportedReview && (
        <SellerReportModal
          isOpen
          onClose={() => setReportedReview(null)}
          seller={{
            id: reportedReview.authorId,
            name: reportedReview.authorName,
          }}
          reviewId={reportedReview.id}
        />
      )}
      {isReportModalOpen && (
        <SellerReportModal
          seller={seller}
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}
    </div>
  );
};
