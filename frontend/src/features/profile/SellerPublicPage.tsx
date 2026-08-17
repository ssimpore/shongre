import { routes } from '../../configuration/routes';
import { isProSeller } from '../../domains/user/user.domain';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
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
} from 'lucide-react';
import { UserProfile, Listing, ReviewItem } from '../../types';
import { userRepository } from '../../repositories/user.repository';
import { listingRepository } from '../../repositories/listing.repository';
import { useAuth } from '../../app/providers/AuthProvider';
import { SellerProfileHeader } from './components/SellerProfileHeader';
import { SellerTrustIndicators } from './components/SellerTrustIndicators';
import { SellerCatalog } from './components/SellerCatalog';
import { SellerReviewsTab } from './components/SellerReviewsTab';
import { ProBusinessInfo } from './components/ProBusinessInfo';
import { SellerReportModal } from './components/SellerReportModal';
import { Button } from '../../design-system/primitives/Button';

export const SellerPublicPage: React.FC = () => {
  const { slug, sellerSlug } = useParams<{ slug?: string; sellerSlug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const activeSlug = slug || sellerSlug || '';

  const [seller, setSeller] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Tab management: catalog | reviews | about
  const tabFromUrl = searchParams.get('tab') as 'catalog' | 'reviews' | 'about' | null;
  const [activeTab, setActiveTab] = useState<'catalog' | 'reviews' | 'about'>(
    tabFromUrl || 'catalog'
  );

  useEffect(() => {
    if (tabFromUrl && ['catalog', 'reviews', 'about'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (newTab: 'catalog' | 'reviews' | 'about') => {
    setActiveTab(newTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newTab === 'catalog') {
        next.delete('tab');
      } else {
        next.set('tab', newTab);
      }
      return next;
    });
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoading(true);
      try {
        const foundSeller = await userRepository.getUserBySlugOrId(activeSlug);
        if (foundSeller) {
          setSeller(foundSeller);
          
          // Set dynamic page title
          const displayName = foundSeller.companyName || foundSeller.name;
          const roleLabel = isProSeller(foundSeller) ? 'Boutique Pro' : 'Vendeur particulier';
          document.title = `${displayName} (${roleLabel}) - Annonces et avis | Shongre`;

          // Load seller's listings via repository
          const sellerListings = await listingRepository.getListingsBySeller(foundSeller.id);
          setListings(sellerListings || []);

          // Load reviews
          const userReviews = await userRepository.getReviewsForUser(foundSeller.id);
          setReviews(userReviews || []);
        } else {
          setSeller(null);
          document.title = 'Profil introuvable | Shongre';
        }
      } catch {
        setSeller(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [activeSlug]);

  const handleContactClick = () => {
    if (!seller) return;
    navigate(`/messages?sellerId=${seller.id}&sellerName=${encodeURIComponent(seller.companyName || seller.name)}`);
  };

  // 1. Loading Skeleton
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
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-stone-900 mb-2">Profil introuvable</h2>
        <p className="text-sm text-stone-500 max-w-md mx-auto mb-6">
          L'utilisateur ou la boutique demandée n'existe pas ou le lien est erroné.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to={routes.home()}>
            <Button variant="outline" size="md" leftIcon={<Home className="w-4 h-4" />}>
              Retour à l'accueil
            </Button>
          </Link>
          <Link to={routes.search()}>
            <Button variant="primary" size="md" leftIcon={<Search className="w-4 h-4" />}>
              Rechercher des annonces
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // 3. Suspended Profile (Safety Barrier)
  if (seller.isSuspended) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-stone-900 mb-2">
          Profil temporairement indisponible
        </h2>
        <p className="text-sm text-stone-600 max-w-md mx-auto mb-6 leading-relaxed">
          Ce compte vendeur a été restreint ou suspendu par nos équipes de modération pour des raisons de conformité et de sécurité. Ses annonces ne sont plus visibles.
        </p>
        <Link to={routes.search()}>
          <Button variant="primary" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Retourner aux annonces
          </Button>
        </Link>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === seller.id;
  const isPro = isProSeller(seller);
  const activeListingsCount = listings.filter((l) => l.status === 'active').length;
  const displayName = isPro ? seller.companyName || seller.name : seller.name;

  return (
    <div className="min-h-screen bg-bg-base pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-xs text-stone-500">
          <Link to={routes.home()} className="hover:text-stone-900 flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Accueil</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-stone-400" />
          {isPro ? (
            <>
              <Link to="/solutions-pro" className="hover:text-stone-900">
                Boutiques Pro
              </Link>
              <ChevronRight className="w-3 h-3 text-stone-400" />
            </>
          ) : (
            <>
              <span className="text-stone-500">Profils</span>
              <ChevronRight className="w-3 h-3 text-stone-400" />
            </>
          )}
          <span className="text-stone-900 font-bold truncate max-w-[200px]">
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
        <div className="border-b border-border-base flex items-center gap-6 text-sm font-bold">
          <button
            type="button"
            onClick={() => handleTabChange('catalog')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'catalog'
                ? 'border-primary text-primary'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Annonces en ligne ({activeListingsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('reviews')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'reviews'
                ? 'border-primary text-primary'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>Avis vérifiés ({reviews.length})</span>
          </button>

          {isPro && (
            <button
              type="button"
              onClick={() => handleTabChange('about')}
              className={`pb-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'about'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Informations légales & SIRET</span>
            </button>
          )}
        </div>

        {/* 4. Tab Content */}
        <div>
          {activeTab === 'catalog' && (
            <SellerCatalog
              listings={listings}
              seller={seller}
              isOwnProfile={isOwnProfile}
            />
          )}

          {activeTab === 'reviews' && (
            <SellerReviewsTab
              seller={seller}
              reviews={reviews}
            />
          )}

          {activeTab === 'about' && isPro && (
            <ProBusinessInfo seller={seller} />
          )}
        </div>
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
