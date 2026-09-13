import React from "react";
import { ChevronRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { ProBadge, VerificationBadge } from "@shongre/ui/web";
import type { UserPresence } from "@shongre/shared/presence";
import { useTranslation } from "../../i18n/I18nProvider";
import { cn } from "../utils/variants";
import { RatingDisplay } from "./Price";
import { SellerAvatarWithPresence } from "./SellerAvatarWithPresence";

export interface SellerIdentityLinkProps {
  to: string;
  name: string;
  avatarUrl?: string;
  isVerified?: boolean;
  isProfessional?: boolean;
  rating?: number;
  reviewCount?: number;
  locationLabel?: string;
  /** Authorized, short-lived presence only; absence is rendered as unknown. */
  presence?: UserPresence;
  surface?: "plain" | "subtle";
  className?: string;
}

/**
 * Compact public seller identity used beside listing actions.
 *
 * Domain screens resolve the destination and pass their public projection;
 * this component owns only the shared presentation and accessible action copy.
 */
export const SellerIdentityLink: React.FC<SellerIdentityLinkProps> = ({
  to,
  name,
  avatarUrl,
  isVerified = false,
  isProfessional = false,
  rating,
  reviewCount,
  locationLabel,
  presence,
  surface = "plain",
  className,
}) => {
  const { t } = useTranslation();
  const hasRating = rating !== undefined && rating > 0;
  const hasLocation = Boolean(locationLabel?.trim());

  return (
    <Link
      to={to}
      aria-label={t(
        isProfessional
          ? "ui.sellerIdentity.openProfessional"
          : "ui.sellerIdentity.openIndividual",
        { name },
      )}
      data-seller-identity="true"
      className={cn(
        "group flex min-w-0 items-center gap-3 rounded-card focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary",
        surface === "subtle" &&
          "border border-border-base bg-bg-subtle p-4 transition-colors hover:border-border-strong hover:bg-bg-surface",
        className,
      )}
    >
      <SellerAvatarWithPresence
        src={avatarUrl}
        name={name}
        presence={presence}
        avatarClassName="transition-shadow group-hover:ring-2 group-hover:ring-primary"
      />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="truncate text-sm font-semibold text-text-main transition-colors group-hover:text-primary sm:text-base"
            data-seller-name="true"
          >
            {name}
          </span>
          {isProfessional ? (
            <ProBadge
              label={t("ui.identityStatus.pro.short")}
              accessibilityLabel={t("ui.identityStatus.pro.account")}
              size="xs"
            />
          ) : isVerified ? (
            <VerificationBadge
              label={t("ui.identityStatus.verification.generic")}
              accessibilityLabel={t("ui.identityStatus.verification.profile")}
              size="xs"
              showIcon={false}
            />
          ) : null}
        </div>

        {hasRating || hasLocation ? (
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-text-muted">
            {hasRating ? (
              <RatingDisplay rating={rating} reviewCount={reviewCount} />
            ) : null}
            {hasRating && hasLocation ? (
              <span aria-hidden="true">·</span>
            ) : null}
            {hasLocation ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin
                  aria-hidden="true"
                  className="h-icon-sm w-icon-sm shrink-0 text-text-disabled"
                />
                <span className="truncate">{locationLabel}</span>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <ChevronRight
        aria-hidden="true"
        className="h-icon-md w-icon-md shrink-0 text-text-disabled transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
      />
    </Link>
  );
};
