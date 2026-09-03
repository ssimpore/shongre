import React from "react";
import { Star } from "lucide-react";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useTranslation } from "../../i18n/I18nProvider";
import { cn, createVariants } from "../utils/variants";

export interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  isNegotiable?: boolean;
  isFreeDonation?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const priceClasses = createVariants({
  base: "text-text-main",
  variants: {
    size: {
      sm: "text-sm font-bold",
      md: "text-base font-bold",
      lg: "text-xl font-bold",
      xl: "text-2xl sm:text-3xl font-bold tracking-tight",
    },
  },
  defaultVariants: { size: "md" },
});

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  originalPrice,
  isNegotiable = false,
  isFreeDonation = false,
  size = "md",
  className,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useMarketLocation();
  const hasDiscount = originalPrice !== undefined && originalPrice > price;

  return (
    <div className={cn("flex flex-wrap items-baseline gap-1.5", className)}>
      <span className={priceClasses({ size })}>
        {formatPrice(price, { isFreeDonation })}
      </span>
      {hasDiscount && originalPrice !== undefined && (
        <span className="text-xs text-text-muted line-through">
          {formatPrice(originalPrice)}
        </span>
      )}
      {isNegotiable && !isFreeDonation && (
        <span className="rounded-md border border-stone-200 bg-stone-100 px-2 py-0.5 text-micro font-semibold text-text-secondary">
          {t("ui.uIComponents.negociable")}
        </span>
      )}
    </div>
  );
};

export interface RatingDisplayProps {
  rating: number;
  reviewCount?: number;
  size?: "sm" | "md";
  className?: string;
}

export const RatingDisplay: React.FC<RatingDisplayProps> = ({
  rating,
  reviewCount,
  size = "sm",
  className,
}) => {
  const { currentLocale } = useMarketLocation();
  const { t } = useTranslation();
  const formattedRating = new Intl.NumberFormat(currentLocale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rating);

  return (
    <div
      role="img"
      aria-label={
        reviewCount === undefined
          ? formattedRating
          : t("ui.listingCard.noteAvis", {
              rating: formattedRating,
              count: reviewCount,
            })
      }
      className={cn("inline-flex items-center gap-1 text-stone-800", className)}
    >
      <Star
        aria-hidden="true"
        className={cn(
          size === "sm" ? "h-icon-sm w-icon-sm" : "h-icon-md w-icon-md",
          "fill-amber-400 text-amber-400",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(size === "sm" ? "text-xs" : "text-sm", "font-bold")}
      >
        {formattedRating}
      </span>
      {reviewCount !== undefined && (
        <span
          aria-hidden="true"
          className="text-xs font-normal text-text-muted"
        >
          ({t("common.reviewCount", { count: reviewCount })})
        </span>
      )}
    </div>
  );
};
