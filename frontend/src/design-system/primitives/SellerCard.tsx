import { isProSeller, showsVerifiedBadge } from '../../domains/user/user.domain';
import React from 'react';
import { ShieldCheck, Star, MapPin, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { UserProfile } from '../../types';
import { Avatar } from './Badge';
import { Badge } from './Badge';
import { useTranslation } from '../../i18n/I18nProvider';

export interface SellerCardProps {
  user: UserProfile;
  showContactAction?: boolean;
  onContact?: () => void;
  className?: string;
}

export const SellerCard: React.FC<SellerCardProps> = ({
  user,
  showContactAction = false,
  onContact,
  className = '',
}) => {
  const { t } = useTranslation();
  const isPro = isProSeller(user);
  const profileUrl = isPro && user.storeSlug ? `/boutique/${user.storeSlug}` : `/profil/${user.slug || user.id}`;

  return (
    <div className={`bg-white rounded-xl border border-border-base p-4 sm:p-5 ${className}`}>
      <div className="flex items-start gap-3.5">
        <Link to={profileUrl} className="shrink-0 group">
          <Avatar
            src={user.avatarUrl}
            name={user.name}
            size="lg"
            isVerified={user.isVerified}
            isPro={isPro}
            className="group-hover:ring-2 group-hover:ring-primary transition-all"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              to={profileUrl}
              className="text-sm sm:text-base font-bold text-stone-900 hover:text-primary transition-colors truncate"
            >
              {user.companyName || user.name}
            </Link>
            {isPro && <Badge variant="pro" size="sm">Pro</Badge>}
            {showsVerifiedBadge(user) && <Badge variant="verified" size="sm" icon>{t('ui.sellerCard.verifie')}</Badge>}
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-stone-600">
            <Link
              to={`${profileUrl}?tab=reviews`}
              className="flex items-center gap-1 font-semibold text-stone-900 hover:text-primary"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {user.rating.toFixed(1)}
              <span className="font-normal text-stone-500">({user.reviewCount} avis)</span>
            </Link>
            <span>•</span>
            <span className="flex items-center gap-1 text-stone-500">
              <MapPin className="w-3 h-3" />
              {user.city}
            </span>
          </div>

          {user.bio && (
            <p className="text-xs text-stone-600 mt-2 line-clamp-2">{user.bio}</p>
          )}
        </div>
      </div>

      <div className="mt-3.5 pt-3 border-t border-border-subtle grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-500">
        <div className="flex items-center gap-1.5 min-w-0">
          <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span className="truncate">Répond {user.responseTimeText}</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <ShieldCheck className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span className="truncate">Taux de réponse : {user.responseRatePercent}%</span>
        </div>
      </div>

      <div className="mt-3 pt-2 flex items-center justify-between gap-2">
        <Link
          to={profileUrl}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1 min-w-0 truncate"
        >
          {isPro ? (
            <>
              <span className="hidden sm:inline">{t('ui.sellerCard.visiterLaBoutiqueOfficielleCatalogue')}</span>
              <span className="sm:hidden">{t('ui.sellerCard.visiterLaBoutique')}</span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">{t('ui.sellerCard.voirLeProfilAnnonces')}</span>
              <span className="sm:hidden">{t('ui.sellerCard.voirLeProfil')}</span>
            </>
          )}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
};
