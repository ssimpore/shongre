import {
  isProSeller,
  showsVerifiedBadge,
} from "../../domains/user/user.domain";
import React from "react";
import { ShieldCheck, Star, MapPin, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { UserProfile } from "../../types";
import { Avatar } from "./Badge";
import { Badge } from "./Badge";
import { useTranslation } from "../../i18n/I18nProvider";
import { routes } from "../../configuration/routes";
import {
  CONTROL_FOCUS_CLASS,
  CONTROL_MOTION_CLASS,
} from "../utils/controlMetrics";

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
  className = "",
}) => {
  const { t } = useTranslation();
  const isPro = isProSeller(user);
  const profileUrl = routes.seller.publicPage({
    id: user.id,
    slug: user.slug,
    storeSlug: user.storeSlug,
    isProfessional: isPro,
  });

  return (
    <div
      className={`bg-bg-surface rounded-card border border-border-base p-4 sm:p-5 ${className}`}
    >
      <div className="flex items-start gap-3.5">
        <Link to={profileUrl} className="shrink-0 group">
          <Avatar
            src={user.avatarUrl}
            name={user.name}
            size="lg"
            isVerified={user.isVerified}
            className={`group-hover:ring-2 group-hover:ring-primary ${CONTROL_MOTION_CLASS}`}
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              to={profileUrl}
              className={`text-sm sm:text-base font-bold text-text-main hover:text-primary ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} truncate`}
            >
              {user.companyName || user.name}
            </Link>
            {isPro && (
              <Badge variant="pro" size="sm">
                {t("ui.sellerCard.pro")}
              </Badge>
            )}
            {showsVerifiedBadge(user) && (
              <Badge variant="verified" size="sm" icon>
                {t("ui.sellerCard.verifie")}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
            <Link
              to={`${profileUrl}?tab=reviews`}
              className="inline-flex items-center gap-1 min-h-6 font-semibold text-text-main hover:text-primary"
            >
              <Star className="w-icon-sm h-icon-sm fill-amber-400 text-amber-400" />
              {user.rating.toFixed(1)}
              <span className="font-normal text-text-muted">
                ({user.reviewCount} avis)
              </span>
            </Link>
            <span>•</span>
            <span className="flex items-center gap-1 text-text-muted">
              <MapPin className="w-icon-xs h-icon-xs" />
              {user.city}
            </span>
          </div>

          {user.bio && (
            <p className="text-xs text-text-secondary mt-2 line-clamp-2">
              {user.bio}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3.5 pt-3 border-t border-border-subtle grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-muted">
        <div className="flex items-center gap-1.5 min-w-0">
          <Clock className="w-icon-sm h-icon-sm text-text-disabled shrink-0" />
          <span className="truncate">Répond {user.responseTimeText}</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <ShieldCheck className="w-icon-sm h-icon-sm text-text-disabled shrink-0" />
          <span className="truncate">
            Taux de réponse : {user.responseRatePercent}%
          </span>
        </div>
      </div>

      <div className="mt-3 pt-2 flex items-center justify-between gap-2">
        <Link
          to={profileUrl}
          className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 min-w-0 min-h-6 truncate"
        >
          {isPro ? (
            <>
              <span className="hidden sm:inline">
                {t("ui.sellerCard.visiterLaBoutiqueOfficielleCatalogue")}
              </span>
              <span className="sm:hidden">
                {t("ui.sellerCard.visiterLaBoutique")}
              </span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">
                {t("ui.sellerCard.voirLeProfilAnnonces")}
              </span>
              <span className="sm:hidden">
                {t("ui.sellerCard.voirLeProfil")}
              </span>
            </>
          )}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
};
