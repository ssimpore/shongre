import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  Share2,
  Flag,
  MapPin,
  Clock,
  ShieldCheck,
  ChevronRight,
  MessageSquare,
  DollarSign,
  ShoppingBag,
  Info,
  CheckCircle2,
  AlertTriangle,
  Send,
  Eye,
  Edit3,
  Sliders,
  TrendingUp,
  Sparkles,
  Star,
} from 'lucide-react';
import { routes } from '../../configuration/routes';
import { listingRepository } from '../../repositories/listing.repository';
import { userRepository } from '../../repositories/user.repository';
import { messagingRepository } from '../../repositories/messaging.repository';
import { Listing, UserProfile, Transaction } from '../../types';
import { taxonomyService } from '../../domains/taxonomy/taxonomy.service';
import { marketService } from '../../domains/market/market.service';
import { transactionCapabilitiesService } from '../../domains/transaction/transaction.capabilities';
import { fulfillmentResolver } from '../../domains/fulfillment/fulfillment.resolver';
import { listingDisplayResolver } from '../../domains/listing/listing.display';
import { listingActionsResolver } from '../../domains/listing/listing.actions';
import { formatPrice, formatRelativeDate, calculateBuyerFee, plural } from '../../utilities/formatters';
import { Breadcrumbs, PriceDisplay, Notice } from '../../design-system/primitives/UIComponents';
import { Button } from '../../design-system/primitives/Button';
import { StatePanel } from '../../design-system/primitives/StatePanel';
import { Badge } from '../../design-system/primitives/Badge';
import { Modal } from '../../design-system/primitives/Modal';
import { Input, Textarea, FormField } from '../../design-system/primitives/FormField';
import { ListingCard } from '../../design-system/primitives/ListingCard';
import { Image } from '../../design-system/primitives/Image';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { storageService } from '../../services/storage.service';
import { isProSeller } from '../../domains/user/user.domain';
import { DirectPurchaseCheckoutModal } from '../transactions/DirectPurchaseCheckoutModal';
import { ReservationCheckoutModal } from '../transactions/components/ReservationCheckoutModal';
import { ListingMediaGallery } from './components/ListingMediaGallery';
import { ListingCharacteristics } from './components/ListingCharacteristics';
import { DropdownMenu } from '../../design-system/primitives/DropdownMenu';
import { ListingFulfillmentSummary } from './components/ListingFulfillmentSummary';
import { ListingSellerTrustSection } from './components/ListingSellerTrustSection';
import { ListingSafetyNotice } from './components/ListingSafetyNotice';

export const ListingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const toast = useToast();

  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<UserProfile | null>(null);
  const [similarListings, setSimilarListings] = useState<Listing[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Dialog States
  const [isDirectPurchaseModalOpen, setIsDirectPurchaseModalOpen] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Form Fields
  const [messageText, setMessageText] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [reportReason, setReportReason] = useState('suspicious');
  const [reportDetails, setReportDetails] = useState('');

  // 1. Data Fetching
  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    listingRepository.getListingById(id).then((item) => {
      if (item) {
        setListing(item);
        setIsFavorite(storageService.getFavorites().includes(item.id));

        userRepository.getUserById(item.sellerId).then((sellerUser) => {
          if (sellerUser) setSeller(sellerUser);
        });

        // Load similar listings by category
        listingRepository
          .getListings({ categorySlug: item.categorySlug, limit: 5 })
          .then((res) => {
            setSimilarListings(res.listings.filter((l) => l.id !== item.id).slice(0, 4));
          });
      }
      setIsLoading(false);
    });
  }, [id]);

  // 2. Taxonomy & Market resolution
  const taxonomyNode = useMemo(() => {
    if (!listing) return null;
    return taxonomyService.getNode(listing.subCategorySlug) || taxonomyService.getNode(listing.categorySlug);
  }, [listing]);

  const effectiveMarket = useMemo(() => {
    const marketCode = listing?.marketCode || storageService.getActiveMarketCode() || 'FR';
    return marketService.getEffectiveConfig(marketCode);
  }, [listing]);

  // 3. Capabilities & Actions Resolution
  const transactionCaps = useMemo(() => {
    if (!listing) return { canContact: true, canDirectPurchase: false, canReserve: false, defaultModes: ['CONTACT_ONLY' as const] };
    return transactionCapabilitiesService.resolve({
      taxonomyNodeId: listing.subCategorySlug || listing.categorySlug,
      marketCode: listing.marketCode,
      sellerType: listing.sellerType,
      sellerIsVerified: listing.sellerIsVerified,
      price: listing.price,
    });
  }, [listing]);

  const actions = useMemo(() => {
    if (!listing) {
      return {
        isOwner: false,
        ownerActions: [],
        primaryAction: 'none' as const,
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

  // 4. Characteristics & Summary derivation
  const summaryAttributes = useMemo(() => {
    if (!listing) return [];
    return listingDisplayResolver.resolveSummaryAttributes(listing, taxonomyNode);
  }, [listing, taxonomyNode]);

  const groupedCharacteristics = useMemo(() => {
    if (!listing) return [];
    return listingDisplayResolver.resolveGroupedCharacteristics(listing, taxonomyNode);
  }, [listing, taxonomyNode]);

  // 5. SEO metadata injection
  useEffect(() => {
    if (!listing) return;
    const meta = listingDisplayResolver.generateListingSeoMeta(listing, taxonomyNode, effectiveMarket);
    document.title = meta.title;

    // Inject Schema.org JSON-LD structured data
    let scriptTag = document.getElementById('listing-jsonld') as HTMLScriptElement;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'listing-jsonld';
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.text = JSON.stringify(meta.jsonLd);

    return () => {
      const el = document.getElementById('listing-jsonld');
      if (el) el.remove();
    };
  }, [listing, taxonomyNode, effectiveMarket]);

  // Handlers
  const handleFavoriteToggle = () => {
    if (!listing) return;
    const next = storageService.toggleFavorite(listing.id);
    setIsFavorite(next);
    toast.info(next ? 'Annonce ajoutée à vos favoris' : 'Annonce retirée de vos favoris');
  };

  const handleShare = () => {
    if (!listing) return;
    if (navigator.share) {
      navigator.share({ title: listing.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Le lien de l\'annonce a été copié dans votre presse-papiers.');
    }
  };

  const handleSendMessage = async () => {
    if (!listing || !messageText.trim()) return;
    const buyerId = currentUser ? currentUser.id : 'guest-user';
    const buyerName = currentUser ? currentUser.name : 'Visiteur';

    await messagingRepository.createOrGetConversation({
      listingId: listing.id,
      buyerId,
      buyerName,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      initialMessage: messageText.trim(),
    });

    setIsContactModalOpen(false);
    setMessageText('');
    toast.success('Votre message a bien été envoyé au vendeur !');
    navigate('/compte/messages');
  };

  const handleSendOffer = async () => {
    if (!listing) return;
    const numPrice = Number(offerPrice);
    if (isNaN(numPrice) || numPrice <= 0) {
      toast.error('Veuillez entrer un montant valide.');
      return;
    }

    const buyerId = currentUser ? currentUser.id : 'user-thomas';
    const buyerName = currentUser ? currentUser.name : 'Thomas Laurent';

    const conv = await messagingRepository.createOrGetConversation({
      listingId: listing.id,
      buyerId,
      buyerName,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      initialMessage: `Proposition d'offre de prix : ${formatPrice(numPrice)} (Prix initial : ${formatPrice(listing.price)})`,
    });

    await messagingRepository.sendOffer({
      conversationId: conv.id,
      senderId: buyerId,
      senderName: buyerName,
      amount: numPrice,
    });

    setIsOfferModalOpen(false);
    setOfferPrice('');
    toast.success(`Votre offre de ${formatPrice(numPrice)} a été transmise au vendeur.`);
    navigate('/compte/messages');
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
        <h1 className="sr-only">Annonce introuvable</h1>
        <StatePanel
          variant="notFound"
          title="Annonce introuvable ou supprimée"
          description="Cette annonce n'est plus accessible ou a été retirée par son vendeur. Des articles similaires sont peut-être disponibles."
          action={
            <Button variant="primary" onClick={() => navigate(routes.search())}>
              Explorer les annonces similaires
            </Button>
          }
          secondaryAction={
            <Button variant="outline" onClick={() => navigate('/')}>
              Retour à l'accueil
            </Button>
          }
        />
      </div>
    );
  }

  const buyerFee = calculateBuyerFee(listing.price);
  // Buyer protection only applies to online payment, so it is the only case where
  // the price shown to the buyer differs from the amount they actually pay.
  const showsBuyerFee = Boolean(listing.isOnlinePaymentAvailable) && listing.price > 0;
  const breadcrumbItems = [
    { label: 'Accueil', href: '/' },
    { label: listing.categoryLabel, href: `/categorie/${listing.categorySlug}` },
    ...(taxonomyNode && taxonomyNode.name !== listing.categoryLabel
      ? [{ label: taxonomyNode.name, href: `/categorie/${listing.categorySlug}?sub=${taxonomyNode.slug}` }]
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
            aria-label="Partager l'annonce"
            className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white border border-border-base px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Partager</span>
          </button>
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            aria-label="Signaler cette annonce"
            className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-danger bg-white border border-border-base px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            <Flag className="w-3.5 h-3.5" />
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
          <ListingMediaGallery photos={listing.photos} title={listing.title} />

          {/* 2. PRIMARY SUMMARY CARD */}
          <div className="bg-white rounded-3xl border border-stone-200/60 p-6 sm:p-8 space-y-5 shadow-sm relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-start justify-between gap-4 relative z-10">
              <div className="space-y-2 flex-1">
                {/* Badges strip: Category, Pro, Boosted */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Badge variant="primary" size="md">{listing.categoryLabel}</Badge>
                  {isProSeller(listing) && <Badge variant="pro" size="md">Vendeur Pro</Badge>}
                  {listing.isBoosted && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-warning-surface text-warning border border-warning-border shadow-2xs">
                      <Sparkles className="w-3.5 h-3.5 text-warning" />
                      À la une
                    </span>
                  )}
                </div>

                {/* Main H1 Title */}
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-900 leading-[1.1] tracking-[-0.01em]">
                  {listing.title}
                </h1>
              </div>

              {/* Favorite Action Button */}
              <button
                type="button"
                onClick={handleFavoriteToggle}
                aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                className="p-3.5 rounded-2xl bg-white hover:bg-primary/5 text-stone-400 hover:text-primary transition-all duration-fast cursor-pointer shrink-0 border border-stone-200 shadow-xs hover:shadow-sm hover:-translate-y-0.5 group"
              >
                <Heart className={`w-6 h-6 transition-all duration-fast ${isFavorite ? 'fill-primary text-primary scale-110' : 'group-hover:scale-110'}`} />
              </button>
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
                <MapPin className="w-4 h-4 text-primary" />
                {listing.city} ({listing.postalCode})
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-stone-400" />
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
              className={`text-sm text-stone-600 leading-[1.7] whitespace-pre-line font-medium ${
                !isDescriptionExpanded && listing.description.length > 450 ? 'line-clamp-6 relative' : ''
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
                className="text-sm font-bold text-primary hover:text-primary-hover hover:underline pt-2 cursor-pointer transition-colors"
              >
                {isDescriptionExpanded ? 'Afficher moins' : 'Afficher la suite'}
              </button>
            )}
          </div>

          {/* 5. FULFILLMENT & DELIVERY SUMMARY */}
          <ListingFulfillmentSummary listing={listing} />

          {/* 6. COMPACT SELLER IDENTITY & TRUST */}
          {seller && (
            <ListingSellerTrustSection
              seller={seller}
              reviews={[]}
            />
          )}

          {/* 7. SAFETY REASSURANCE NOTICE */}
          <ListingSafetyNotice isOnlinePaymentAvailable={listing.isOnlinePaymentAvailable} />

          {/* 8. LISTING BOTTOM METADATA */}
          <div className="p-4 rounded-xl bg-bg-base/60 text-micro text-stone-500 flex items-center justify-between flex-wrap gap-2 border border-border-subtle">
            <span>Référence annonce : <strong className="font-mono text-stone-700">{listing.id}</strong></span>
            <Link
              to={`/contact?context=listing&listingId=${listing.id}`}
              className="text-primary hover:underline font-bold inline-flex items-center gap-1"
            >
              Signaler ou demander de l'aide sur cette annonce
            </Link>
            <span>Dernière mise à jour : {formatRelativeDate(listing.updatedAt || listing.createdAt)}</span>
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
                Prix de l'article
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
                  <ShieldCheck className="w-4 h-4 text-success shrink-0" />
                  Protection Acheteur incluse, calculée au paiement
                </p>
              )}
            </div>

            {/* Seller identity.
                Who you are buying from belongs next to the price and the buy
                button, not only further down the page — it is part of the same
                decision. */}
            {seller && (
              <Link
                to={isProSeller(seller) ? `/boutique/${seller.storeSlug || seller.slug || seller.id}` : `/profil/${seller.slug || seller.id}`}
                className="group flex items-start gap-3 p-4 rounded-2xl border border-stone-200/60 bg-stone-50/60 hover:bg-stone-50 hover:border-stone-300 transition-colors"
              >
                <div className="relative shrink-0">
                  <Image
                    src={seller.avatarUrl}
                    alt=""
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
                    {isProSeller(seller) && <Badge variant="pro" size="sm">Pro</Badge>}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-1 flex-wrap">
                    {seller.rating > 0 && (
                      <span className="flex items-center gap-1 font-semibold text-stone-700">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {seller.rating.toFixed(1)}
                        <span className="font-normal text-stone-500">
                          ({plural(seller.reviewCount || 0, 'avis', 'avis')})
                        </span>
                      </span>
                    )}
                    {seller.rating > 0 && seller.city && <span aria-hidden="true">·</span>}
                    {seller.city && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        {seller.city}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-stone-400 shrink-0 mt-1 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>
            )}

            {/* ===================================================================== */}
            {/* OWNER ACTIONS vs BUYER ACTIONS */}
            {/* ===================================================================== */}
            {actions.isOwner ? (
              <div className="p-5 bg-primary/5 border border-primary/20 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <Edit3 className="w-4 h-4" />
                  <span>Vous êtes l'auteur de cette annonce</span>
                </div>
                <div className="space-y-2">
                  <Button
                    to={`/deposer?edit=${listing.id}`}
                    variant="primary"
                    size="lg"
                    fullWidth
                    leftIcon={<Edit3 className="w-4 h-4" />}
                  >
                    Modifier mon annonce
                  </Button>
                  <Button
                    to="/compte/annonces"
                    variant="outline"
                    size="md"
                    fullWidth
                    leftIcon={<Sliders className="w-4 h-4" />}
                  >
                    Gérer mes annonces & stats
                  </Button>
                </div>
              </div>
            ) : actions.statusNotice ? (
              /* Non-Active Status Notice (Reserved, Sold, Expired) */
              <div className="p-5 bg-warning-surface border border-warning-border rounded-2xl space-y-3 text-center">
                <div className="flex items-center justify-center gap-2 font-bold text-warning text-base">
                  <Clock className="w-5 h-5 text-warning" />
                  <span>{actions.statusNotice.title}</span>
                </div>
                <p className="text-sm text-warning leading-relaxed font-medium">
                  {actions.statusNotice.message}
                </p>
                {actions.statusNotice.isBuyerReserver && (
                  <Button
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

                 It previously mixed `size="lg"` plus a `py-3.5` override (48px)
                 with `size="md"` (44px), and put the last two in a fixed
                 two-column row — so a listing that allowed contact but not an
                 offer rendered a single half-width "Message" button stranded
                 beside an empty cell. */
              <div className="space-y-3">
                {/* 1. Direct Online Purchase (Primary CTA if available) */}
                {actions.canDirectPurchase && (
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => setIsDirectPurchaseModalOpen(true)}
                    leftIcon={<ShieldCheck className="w-5 h-5" />}
                    className="shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
                  >
                    Acheter maintenant
                  </Button>
                )}

                {/* 2. Reservation (Secondary or Primary CTA if available) */}
                {actions.canReserve && (
                  <Button
                    variant={actions.primaryAction === 'reservation' ? 'primary' : 'outline'}
                    size="lg"
                    fullWidth
                    onClick={() => setIsReservationModalOpen(true)}
                    leftIcon={<Clock className="w-5 h-5 text-warning" />}
                  >
                    Réserver l'article
                  </Button>
                )}

                <div
                  className={`grid gap-3 pt-1 ${
                    actions.canMakeOffer && actions.canContact ? 'grid-cols-2' : 'grid-cols-1'
                  }`}
                >
                  {/* 3. Price Negotiation Offer */}
                  {actions.canMakeOffer && (
                    <Button
                      variant="outline"
                      size="lg"
                      fullWidth
                      onClick={() => setIsOfferModalOpen(true)}
                      leftIcon={<DollarSign className="w-4 h-4 text-warning" />}
                    >
                      Offre de prix
                    </Button>
                  )}

                  {/* 4. Direct Contact Message */}
                  {actions.canContact && (
                    <Button
                      variant={actions.primaryAction === 'contact' ? 'primary' : 'secondary'}
                      size="lg"
                      fullWidth
                      onClick={() => setIsContactModalOpen(true)}
                      leftIcon={<MessageSquare className="w-4 h-4" />}
                    >
                      Message
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
                Annonces similaires dans {listing.categoryLabel}
              </h2>
              <p className="text-xs text-stone-500">
                Sélection d'articles recommandés selon vos critères
              </p>
            </div>

            <Link
              to={`/categorie/${listing.categorySlug}`}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span>Voir tout</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {similarListings.map((simListing) => (
              <ListingCard key={simListing.id} listing={simListing} />
            ))}
          </div>
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
            setListing((prev) => (prev ? { ...prev, status: 'sold' } : null));
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
            setListing((prev) => (prev ? { ...prev, status: 'reserved' } : null));
            toast.success('Réservation enregistrée et fonds placés sous séquestre !');
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
          <FormField label="Votre message" required>
            <Textarea
              rows={4}
              placeholder="Bonjour, votre article m'intéresse beaucoup. Est-il toujours disponible ?..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
          </FormField>

          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setIsContactModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" fullWidth onClick={handleSendMessage} leftIcon={<Send className="w-4 h-4" />}>
              Envoyer le message
            </Button>
          </div>
        </div>
      </Modal>

      {/* 4. Price Offer Modal */}
      <Modal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        title="Faire une offre de prix"
        description={`Prix actuel : ${formatPrice(listing.price)}`}
      >
        <div className="space-y-4 text-xs">
          <FormField label="Montant de votre offre (€)" required>
            <Input
              type="number"
              placeholder="ex: 120"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
            />
          </FormField>

          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setIsOfferModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" fullWidth onClick={handleSendOffer}>
              Transmettre l'offre
            </Button>
          </div>
        </div>
      </Modal>

      {/* 5. Report Listing Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Signaler cette annonce"
        description="Aidez l'équipe de modération à préserver la sécurité sur Shongre"
      >
        <div className="space-y-4 text-xs">
          <FormField label="Motif du signalement">
            <DropdownMenu
              id="report-reason-select"
              ariaLabel="Motif du signalement"
              fullWidth
              headerTitle="Motif du signalement"
              options={[
                { value: 'suspicious', label: 'Tentative de fraude ou arnaque' },
                { value: 'prohibited', label: 'Article illégal ou interdit' },
                { value: 'counterfeit', label: 'Contrefaçon' },
                { value: 'wrong_category', label: 'Mauvaise catégorie' },
                { value: 'other', label: 'Autre motif' },
              ]}
              value={reportReason}
              onChange={(val) => setReportReason(val)}
            />
          </FormField>

          <FormField label="Précisions complémentaires">
            <Textarea
              rows={3}
              placeholder="Expliquez ce qui vous semble anormal..."
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
            />
          </FormField>

          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setIsReportModalOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={() => {
                setIsReportModalOpen(false);
                toast.success('Votre signalement a été transmis avec succès.');
              }}
            >
              Envoyer le signalement
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
      <div className="lg:hidden fixed inset-x-0 bottom-[var(--mobile-nav-total-h)] md:bottom-0 bg-white/95 backdrop-blur-md border-t border-stone-200/60 p-3 sm:px-6 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-30 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-0.5">
            {showsBuyerFee ? 'Total à payer' : 'Prix'}
          </div>
          <div className="text-lg font-black text-stone-900 truncate tabular-nums leading-none">
            {listing.isFreeDonation
              ? 'Don gratuit'
              : formatPrice(showsBuyerFee ? listing.price + buyerFee : listing.price)}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {actions.isOwner ? (
            <Button
              to={`/deposer?edit=${listing.id}`}
              variant="primary"
              size="sm"
              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
            >
              Modifier
            </Button>
          ) : actions.statusNotice ? (
            <span className="text-xs font-bold text-warning bg-warning-surface px-3 py-1.5 rounded-lg">
              {actions.statusNotice.title}
            </span>
          ) : (
            <>
              {actions.canMakeOffer && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOfferModalOpen(true)}
                  leftIcon={<DollarSign className="w-3.5 h-3.5 text-warning" />}
                >
                  Offre
                </Button>
              )}
              {actions.canReserve && (
                <Button
                  variant={actions.canDirectPurchase ? 'outline' : 'primary'}
                  size="sm"
                  onClick={() => setIsReservationModalOpen(true)}
                  leftIcon={<Clock className="w-3.5 h-3.5 text-warning" />}
                >
                  Réserver
                </Button>
              )}
              {actions.canContact && (
                <Button
                  variant={actions.primaryAction === 'contact' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setIsContactModalOpen(true)}
                  leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                >
                  Message
                </Button>
              )}
              {actions.canDirectPurchase && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsDirectPurchaseModalOpen(true)}
                  leftIcon={<ShoppingBag className="w-3.5 h-3.5" />}
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
