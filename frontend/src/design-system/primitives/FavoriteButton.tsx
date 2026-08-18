import React from 'react';
import { Heart } from 'lucide-react';

export type FavoriteButtonSize = 'sm' | 'md' | 'lg';
export type FavoriteButtonVariant = 'bare' | 'floating';

export interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: (e: React.MouseEvent) => void;
  /** Visual size. The hit area stays at 44px regardless — see below. */
  size?: FavoriteButtonSize;
  /** `floating` sits on top of media and carries its own surface. */
  variant?: FavoriteButtonVariant;
  className?: string;
}

const ICON: Record<FavoriteButtonSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

/**
 * Desktop keeps the compact size; coarse pointers get a real 44px control.
 *
 * An absolutely-positioned overlay was tried first, but listing cards are
 * `rounded-2xl overflow-hidden`, so anything extending past the card edge is
 * clipped — the target grew in three directions and not the fourth. Sizing the
 * control itself is the only version that actually holds.
 */
const BOX: Record<FavoriteButtonSize, string> = {
  sm: 'w-6 h-6 pointer-coarse:w-control-touch pointer-coarse:h-control-touch',
  md: 'w-8 h-8 pointer-coarse:w-control-touch pointer-coarse:h-control-touch',
  lg: 'w-9 h-9 pointer-coarse:w-control-touch pointer-coarse:h-control-touch',
};

/**
 * The single favourite control.
 *
 * There were three hand-rolled versions of this: 32px and 36px in ListingCard,
 * and a 22px one in the homepage hero rail that filled the heart `rose-500`
 * while every other surface filled it `primary` — the same state in two colours,
 * on the same page.
 *
 * Two things are deliberate here:
 *
 * 1. **`primary` is the favourited colour**, everywhere. A saved item is a brand
 *    state, not a danger state, and it should not drift back to a red ramp.
 * 2. **The hit area is always ≥44px** (WCAG 2.5.5), decoupled from the visual
 *    size via an absolutely-positioned overlay, so a visually small heart in a
 *    dense rail is still comfortably tappable without changing the layout.
 */
export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  isFavorite,
  onToggle,
  size = 'md',
  variant = 'bare',
  className = '',
}) => {
  const surface =
    variant === 'floating'
      ? 'rounded-full bg-white/90 backdrop-blur-xs shadow-xs text-stone-600 hover:bg-white'
      : 'rounded-full text-stone-500 hover:bg-stone-100';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={`relative flex items-center justify-center shrink-0 transition-all hover:text-primary active:scale-90 cursor-pointer ${BOX[size]} ${surface} ${className}`}
    >
      <Heart className={`${ICON[size]} ${isFavorite ? 'fill-primary text-primary' : ''}`} />
    </button>
  );
};
