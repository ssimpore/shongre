import React from "react";

export interface ListingGridProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * The shared grid geometry for standard listing surfaces.
 *
 * Mobile keeps two readable columns. From `sm` onward every standard listing
 * card uses the same fixed width as a rail card, so a one-result search does
 * not expand into a different card shape than the home and category rails.
 */
export const ListingGrid: React.FC<ListingGridProps> = ({
  children,
  className = "",
}) => (
  <div
    className={`listing-grid grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,var(--spacing-listing-card))] sm:justify-start sm:gap-4 ${className}`}
  >
    {children}
  </div>
);
