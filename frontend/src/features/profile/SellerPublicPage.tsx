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
  ShieldAlert,
  Search,
  Package,
  Star,
  Building2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { UserProfile, Listing, ReviewItem } from "../../types";
import { userRepository } from "../../repositories/user.repository";
import { listingRepository } from "../../repositories/listing.repository";
import { useAuth } from "../../app/providers/AuthProvider";
import { SellerProfileHeader } from "./components/SellerProfileHeader";
import { SellerTrustIndicators } from "./components/SellerTrustIndicators";
import { SellerCatalog } from "./components/SellerCatalog";
import { SellerReviewsTab } from "./components/SellerReviewsTab";
import { ProBusinessInfo } from "./components/ProBusinessInfo";
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
  const { marketContext } = useMarketLocation();

  const activeSlug = slug || sellerSlug || "";
  const publicRouteData = usePublicRouteData();
  const initialData =
    publicRouteData?.kind === "seller" &&
    [
      publicRouteData.seller.slug,
      publicRouteData.seller.storeSlug,
      publicRouteData.seller.id,
    ].includes(activeSlug)
      ? publicRouteData
      : null;

  const [seller, setSeller] = useState<UserProfile | null>(
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
        const foundSeller = await userRepository.getUserBySlugOrId(activeSlug);
        if (foundSeller) {
          setSeller(foundSeller);

          // Load seller's listings via repository
          const sellerListings = await listingRepository.getListingsBySeller(
            foundSeller.id,
          );
          setListings(sellerListings || []);

          // Load reviews
          const userReviews = await userRepository.getReviewsForUser(
            foundSeller.id,
          );
          setReviews(userReviews || []);
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
  }, [activeSlug, initialData]);

  const handleContactClick = () => {
    if (!seller) return;
    navigate(
      `/messages?sellerId=${seller.id}&sellerName=${encodeURIComponent(seller.companyName || seller.name)}`,
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
        <div className="h-6 w-48 bg-stone-200 rounded-md" />
        <div className="h-64 bg-stone-200 rounded-2xl" />
        <div className="h-24 bg-stone-200 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-72 bg-stone-200 rounded-2xl" />
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
        <h1 className="text-2xl font-black text-stone-900 mb-2">
          Profil introuvable
        </h1>
        <p className="text-sm text-stone-500 max-w-md mx-auto mb-6">
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

  // 3. Suspended Profile (Safety Barrier)
  if (seller.isSuspended) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-danger-surface border border-danger-border text-danger flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-stone-900 mb-2">
          Profil temporairement indisponible
        </h1>
        <p className="text-sm text-stone-600 max-w-md mx-auto mb-6 leading-relaxed">
          {t("profile.sellerPublicPage.ceCompteVendeurAEte")}
        </p>
        <Button
          to={routes.search()}
          variant="primary"
          size="md"
          leftIcon={<ArrowLeft className="w-icon-md h-icon-md" />}
        >
          {t("profile.sellerPublicPage.retournerAuxAnnonces")}
        </Button>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === seller.id;
  const isPro = isProSeller(seller);
  const activeListingsCount = listings.filter(
    (l) => l.status === "active",
  ).length;
  const displayName = isPro ? seller.companyName || seller.name : seller.name;

  return (
    <div className="min-h-screen bg-bg-base pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Fil d'Ariane"
          className="flex items-center gap-1.5 text-xs text-stone-500"
        >
          <Link
            to={routes.home()}
            className="hover:text-stone-900 flex items-center gap-1"
          >
            <Home className="w-icon-sm h-icon-sm" />
            <span>Accueil</span>
          </Link>
          <ChevronRight className="w-icon-xs h-icon-xs text-stone-400" />
          {isPro ? (
            <>
              <Link to="/solutions-pro" className="hover:text-stone-900">
                Boutiques Pro
              </Link>
              <ChevronRight className="w-icon-xs h-icon-xs text-stone-400" />
            </>
          ) : (
            <>
              <span className="text-stone-500">Profils</span>
              <ChevronRight className="w-icon-xs h-icon-xs text-stone-400" />
            </>
          )}
          <span className="text-stone-900 font-bold truncate max-w-50">
            {displayName}
          </span>
        </nav>

        {/* 1. Header Profile Banner */}
        <SellerProfileHeader
          seller={seller}
          activeListingsCount={activeListingsCount}
          activeTab={activeTab}
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
            ...(isPro
              ? [
                  {
                    id: "about",
                    label: "Informations légales",
                    icon: <Building2 className="w-icon-md h-icon-md" />,
                  },
                ]
              : []),
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

          {activeTab === "reviews" && (
            <SellerReviewsTab seller={seller} reviews={reviews} />
          )}

          {activeTab === "about" && isPro && (
            <ProBusinessInfo seller={seller} />
          )}
        </TabPanel>
      </div>

      {/* Safety Report Modal */}
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
