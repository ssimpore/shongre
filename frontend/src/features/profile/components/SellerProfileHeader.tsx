import { isProSeller } from '../../../domains/user/user.domain';
import React, { useState } from 'react';

import {
  MapPin,
  Star,
  ShieldCheck,
  Calendar,
  MessageSquare,
  Share2,
  Heart,
  MoreVertical,
  Flag,
  Ban,
  Check,
  Building2,
  ExternalLink,
  Edit3,
  List,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '../../../types';
import { Avatar, Badge } from '../../../design-system/primitives/Badge';
import { Button } from '../../../design-system/primitives/Button';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useToast } from '../../../app/providers/ToastProvider';
import { userRepository } from '../../../repositories/user.repository';
import { Image } from '../../../design-system/primitives/Image';

export interface SellerProfileHeaderProps {
  seller: UserProfile;
  activeListingsCount: number;
  activeTab: 'catalog' | 'reviews' | 'about';
  onTabChange: (tab: 'catalog' | 'reviews' | 'about') => void;
  isOwnProfile: boolean;
  onContactClick: () => void;
  onOpenReportModal: () => void;
}

export const SellerProfileHeader: React.FC<SellerProfileHeaderProps> = ({
  seller,
  activeListingsCount,
  activeTab,
  onTabChange,
  isOwnProfile,
  onContactClick,
  onOpenReportModal,
}) => {
  const { currentUser, isAuthenticated } = useAuth();
  const toast = useToast();

  const [isFollowing, setIsFollowing] = useState(() => userRepository.isFollowing(seller.id));
  const [isBlocked, setIsBlocked] = useState(() => userRepository.isBlocked(seller.id));
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isPro = isProSeller(seller);
  const displayName = isPro ? seller.companyName || seller.name : seller.name;
  
  // Format member seniority
  const memberYear = seller.createdAt ? new Date(seller.createdAt).getFullYear() : '2024';

  const handleFollowToggle = () => {
    if (!isAuthenticated) {
      toast.info('Connectez-vous pour suivre ce vendeur et recevoir ses nouveautés.');
      return;
    }
    const nextState = userRepository.toggleFollow(seller.id);
    setIsFollowing(nextState);
    if (nextState) {
      toast.success(`Vous suivez désormais ${displayName}. Vous serez notifié de ses nouvelles annonces.`);
    } else {
      toast.info(`Vous ne suivez plus ${displayName}.`);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: `${displayName} sur Shongre`,
      text: isPro
        ? `Découvrez la boutique officielle de ${displayName} sur Shongre.`
        : `Consultez les annonces de ${displayName} sur Shongre.`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Lien du profil copié dans le presse-papier !');
      } catch {
        toast.info(shareUrl);
      }
    }
  };

  const handleBlockToggle = () => {
    if (!isAuthenticated) {
      toast.info('Connectez-vous pour bloquer un utilisateur.');
      return;
    }
    const nextBlocked = userRepository.toggleBlock(seller.id);
    setIsBlocked(nextBlocked);
    setIsMenuOpen(false);
    if (nextBlocked) {
      toast.warning(`${displayName} a été bloqué. Ses messages et offres seront masqués.`);
    } else {
      toast.success(`${displayName} a été débloqué.`);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-border-base overflow-hidden shadow-xs">
      {/* Cover Header for Pro or decorative header for Individual */}
      {isPro ? (
        <div className="relative h-40 sm:h-56 w-full bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 overflow-hidden">
          {seller.storeBannerUrl ? (
            <Image
              src={seller.storeBannerUrl}
              alt={`Bannière de ${displayName}`}
              className="w-full h-full object-cover opacity-80"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-30">
              <Building2 className="w-24 h-24 text-white" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
          
          <div className="absolute top-4 right-4 flex items-center gap-2 flex-wrap">
            <Badge variant="pro" size="md">
              Boutique Professionnelle
            </Badge>
            {seller.isVerified && (
              <Badge variant="verified" size="md" icon>
                SIRET Vérifié
              </Badge>
            )}
          </div>
        </div>
      ) : (
        <div className="h-20 sm:h-28 bg-gradient-to-r from-[#FAF8F5] via-[#F4F1EA] to-[#EAE5DC] border-b border-border-base relative">
          <div className="absolute top-3 right-4 flex items-center gap-2">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider bg-white/80 px-2.5 py-1 rounded-full border border-stone-200 backdrop-blur-xs">
              Profil Particulier
            </span>
          </div>
        </div>
      )}

      {/* Main Profile Info Section */}
      <div className="p-5 sm:p-7 relative">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-5 -mt-14 sm:-mt-18 mb-6">
          
          {/* Avatar & Main Identity */}
          <div className="flex items-end gap-4 w-full md:w-auto">
            <div className="relative shrink-0">
              <Avatar
                src={seller.avatarUrl}
                name={displayName}
                size="xl"
                isVerified={seller.isVerified}
                isPro={isPro}
                className="ring-4 ring-white shadow-md bg-white"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-stone-900 leading-tight">
                  {displayName}
                </h1>
                {isPro ? (
                  <Badge variant="pro" size="sm">Pro</Badge>
                ) : (
                  <span className="text-xs font-semibold text-stone-500 bg-stone-100 px-2 py-1 rounded-full">
                    Particulier
                  </span>
                )}
                {seller.isVerified && (
                  <Badge variant="verified" size="sm" icon>
                    Vérifié
                  </Badge>
                )}
              </div>

              {/* Sub-header meta row */}
              <div className="flex items-center gap-3 mt-1.5 text-xs sm:text-sm text-stone-600 flex-wrap">
                {/* Rating trigger */}
                <button
                  type="button"
                  onClick={() => onTabChange('reviews')}
                  className="flex items-center gap-1.5 font-bold text-stone-900 hover:text-primary transition-colors cursor-pointer group"
                  aria-label={`Note moyenne : ${seller.rating.toFixed(1)} sur 5 basée sur ${seller.reviewCount} avis`}
                >
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span>{seller.rating.toFixed(1)}</span>
                  <span className="font-normal text-stone-500 underline decoration-stone-300 group-hover:decoration-primary">
                    ({seller.reviewCount} avis)
                  </span>
                </button>

                <span className="text-stone-300 hidden sm:inline">•</span>

                {/* Location */}
                <span className="flex items-center gap-1 text-stone-600">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  {seller.city} {seller.postalCode ? `(${seller.postalCode.slice(0, 2)})` : ''}
                </span>

                <span className="text-stone-300 hidden sm:inline">•</span>

                {/* Seniority */}
                <span className="flex items-center gap-1 text-stone-500">
                  <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  Membre depuis {memberYear}
                </span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0">
            {isOwnProfile ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  to={isPro ? '/compte/pro/vitrine' : '/compte'}
                  variant="outline"
                  size="md"
                  fullWidth
                  leftIcon={<Edit3 className="w-4 h-4" />}
                  className="flex-1 sm:flex-initial"
                >
                  Modifier mon profil
                </Button>
                <Button
                  to="/compte/annonces"
                  variant="secondary"
                  size="md"
                  fullWidth
                  leftIcon={<List className="w-4 h-4" />}
                  className="flex-1 sm:flex-initial"
                >
                  Gérer mes annonces
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="md"
                  onClick={onContactClick}
                  leftIcon={<MessageSquare className="w-4 h-4" />}
                  className="flex-1 sm:flex-initial"
                >
                  {isPro ? 'Contacter la boutique' : 'Contacter le vendeur'}
                </Button>

                <Button
                  variant={isFollowing ? 'secondary' : 'outline'}
                  size="md"
                  onClick={handleFollowToggle}
                  leftIcon={<Heart className={`w-4 h-4 ${isFollowing ? 'fill-primary text-primary' : ''}`} />}
                  className="hidden sm:inline-flex"
                >
                  {isFollowing ? 'Abonné' : 'Suivre'}
                </Button>

                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Partager ce profil"
                  className="p-2.5 rounded-xl border border-border-base hover:bg-bg-subtle text-stone-700 transition-colors cursor-pointer"
                  title="Partager ce profil"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                {/* Overflow Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Options supplémentaires"
                    className="p-2.5 rounded-xl border border-border-base hover:bg-bg-subtle text-stone-700 transition-colors cursor-pointer"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {isMenuOpen && (
                    <div
                      className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-border-base py-1.5 z-30 animate-in fade-in zoom-in-95 duration-fast"
                      onMouseLeave={() => setIsMenuOpen(false)}
                    >
                      <button
                        type="button"
                        onClick={handleFollowToggle}
                        className="w-full sm:hidden flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-bg-subtle text-left"
                      >
                        <Heart className={`w-4 h-4 ${isFollowing ? 'fill-primary text-primary' : ''}`} />
                        {isFollowing ? 'Ne plus suivre' : 'Suivre ce vendeur'}
                      </button>
                      <button
                        type="button"
                        onClick={handleShare}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-bg-subtle text-left"
                      >
                        <Share2 className="w-4 h-4 text-stone-400" />
                        Partager ce profil
                      </button>
                      <div className="border-t border-border-subtle my-1" />
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenReportModal();
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-warning hover:bg-warning-surface text-left"
                      >
                        <Flag className="w-4 h-4 text-warning" />
                        Signaler ce profil
                      </button>
                      <button
                        type="button"
                        onClick={handleBlockToggle}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-danger hover:bg-danger-surface text-left"
                      >
                        <Ban className="w-4 h-4 text-danger" />
                        {isBlocked ? 'Débloquer cet utilisateur' : 'Bloquer cet utilisateur'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bio description */}
        {seller.bio && (
          <div className="border-t border-border-subtle pt-4 mb-4">
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed max-w-4xl whitespace-pre-line">
              {seller.bio}
            </p>
          </div>
        )}

        {/* Fast Key Metrics Row */}
        <div className="border-t border-border-subtle pt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-stone-500">
          <div className="bg-bg-base p-2.5 rounded-xl border border-border-base">
            <span className="font-bold block text-stone-900">{activeListingsCount}</span>
            <span className="text-xs">Annonce{activeListingsCount > 1 ? 's' : ''} en ligne</span>
          </div>

          <div className="bg-bg-base p-2.5 rounded-xl border border-border-base">
            <span className="font-bold block text-stone-900">{seller.responseRatePercent}%</span>
            <span className="text-xs">Taux de réponse</span>
          </div>

          <div className="bg-bg-base p-2.5 rounded-xl border border-border-base">
            <span className="font-bold block text-stone-900 truncate">
              {seller.responseTimeText || 'Rapide'}
            </span>
            <span className="text-xs">Délai moyen de réponse</span>
          </div>

          <div className="bg-bg-base p-2.5 rounded-xl border border-border-base">
            <span className="font-bold block text-stone-900">
              {seller.rating.toFixed(1)} / 5
            </span>
            <span className="text-xs">{seller.reviewCount} avis clients</span>
          </div>
        </div>

      </div>
    </div>
  );
};
