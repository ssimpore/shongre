import React from "react";

export interface SelectableCardProps {
  /** Whether this card is the currently chosen option. */
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  /**
   * What the card offers, for assistive technology. Falls back to the card's own
   * text content, which is usually right — pass it when the card's visible copy
   * is not a usable name on its own (a bare price, an icon-led row).
   */
  "aria-label"?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * A large, card-shaped choice: delivery method, payout speed, shipping quote,
 * verification route.
 *
 * These were written as `<div onClick>` across the checkout, payout and
 * verification flows, which made every one of them mouse-only — a keyboard or
 * screen-reader user could open the reservation modal and then had no way to
 * pick how the item would reach them, so the purchase could not be completed at
 * all. They also announced as plain text, giving no hint that a choice existed.
 *
 * It stays a `<div>` with button semantics rather than becoming a real
 * `<button>` on purpose: several of these cards reveal their own inputs (a
 * phone number, a relay-point `<select>`) once chosen, and interactive controls
 * nested inside a `<button>` are invalid and unreachable. `aria-pressed` carries
 * the chosen/not-chosen state that the terracotta ring communicates visually.
 */
export const SelectableCard: React.FC<SelectableCardProps> = ({
  selected,
  onSelect,
  disabled = false,
  className = "",
  children,
  ...rest
}) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    // Only the card itself responds. Without this, Space typed into a nested
    // phone field would re-toggle the card instead of inserting a space.
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    onSelect();
  };

  return (
    <div
      role="button"
      aria-pressed={selected}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onSelect}
      onKeyDown={handleKeyDown}
      className={`surface-interactive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer active:scale-press-surface"
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};
