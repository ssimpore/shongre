import React from 'react';
import { X } from 'lucide-react';

export interface FilterChipProps {
  /** Human-readable filter value, e.g. `Véhicules` or `"vélo gravel"`. */
  children: React.ReactNode;
  /**
   * What kind of filter this represents. Only used to tint the chip so a user
   * can tell apart a query, a category and a transactional facet at a glance —
   * it carries no business meaning.
   */
  tone?: 'query' | 'neutral' | 'strong' | 'success' | 'warning';
  /**
   * Called when the user removes the filter. Omit for read-only chips.
   * The remove control is always given an accessible name derived from `label`.
   */
  onRemove?: () => void;
  /**
   * Short description of what is being removed, used to build the accessible
   * name of the remove button ("Retirer le filtre Véhicules").
   */
  label?: string;
  className?: string;
}

const TONE_STYLES: Record<NonNullable<FilterChipProps['tone']>, string> = {
  query: 'bg-primary-light text-primary border-primary-border',
  neutral: 'bg-stone-100 text-stone-800 border-stone-200',
  strong: 'bg-stone-900 text-white border-stone-900',
  success: 'bg-success-surface text-success border-success-border',
  warning: 'bg-warning-surface text-warning border-warning-border',
};

/**
 * Compact, removable representation of one active filter.
 *
 * Replaces the hand-rolled `<span class="rounded-full">…<button><X/></button>`
 * blocks that were repeated across search, workspace and admin filter bars —
 * those all shipped remove buttons with no accessible name.
 */
export const FilterChip: React.FC<FilterChipProps> = ({
  children,
  tone = 'neutral',
  onRemove,
  label,
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1 max-w-full text-xs font-semibold pl-2.5 ${
        onRemove ? 'pr-1' : 'pr-2.5'
      } py-1 rounded-full border ${TONE_STYLES[tone]} ${className}`}
    >
      <span className="truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Retirer le filtre ${label ?? (typeof children === 'string' ? children : '')}`.trim()}
          className="shrink-0 w-4 h-4 inline-flex items-center justify-center rounded-full hover:bg-black/10 transition-colors cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};
