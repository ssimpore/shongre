import React from 'react';
import { Star } from 'lucide-react';
import { formatPrice } from '../../utilities/formatters';
import { useTranslation } from '../../i18n/I18nProvider';
import { cn, createVariants } from '../utils/variants';

export interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  isNegotiable?: boolean;
  isFreeDonation?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const priceClasses = createVariants({
  base: 'text-stone-900',
  variants: {
    size: {
      sm: 'text-sm font-bold',
      md: 'text-base font-bold',
      lg: 'text-xl font-extrabold',
      xl: 'text-2xl sm:text-3xl font-extrabold tracking-tight',
    },
  },
  defaultVariants: { size: 'md' },
});

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  originalPrice,
  isNegotiable = false,
  isFreeDonation = false,
  size = 'md',
  className,
}) => {
  const { t } = useTranslation();
  const hasDiscount = Boolean(originalPrice && originalPrice > price);

  return (
    <div className={cn('flex flex-wrap items-baseline gap-1.5', className)}>
      <span className={priceClasses({ size })}>{formatPrice(price, { isFreeDonation })}</span>
      {hasDiscount && (
        <span className="text-xs text-stone-500 line-through">{formatPrice(originalPrice)}</span>
      )}
      {isNegotiable && !isFreeDonation && (
        <span className="rounded-md border border-stone-200 bg-stone-100 px-2 py-0.5 text-micro font-semibold text-stone-600">
          {t('ui.uIComponents.negociable')}
        </span>
      )}
    </div>
  );
};

export interface RatingDisplayProps {
  rating: number;
  reviewCount?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export const RatingDisplay: React.FC<RatingDisplayProps> = ({
  rating,
  reviewCount,
  size = 'sm',
  className,
}) => (
  <div className={cn('inline-flex items-center gap-1 text-stone-800', className)}>
    <Star
      aria-hidden="true"
      className={cn(
        size === 'sm' ? 'h-icon-sm w-icon-sm' : 'h-icon-md w-icon-md',
        'fill-amber-400 text-amber-400',
      )}
    />
    <span className={cn(size === 'sm' ? 'text-xs' : 'text-sm', 'font-bold')}>
      {rating.toFixed(1)}
    </span>
    {reviewCount !== undefined && (
      <span className="text-xs font-normal text-stone-500">({reviewCount})</span>
    )}
  </div>
);
