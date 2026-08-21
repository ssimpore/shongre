import React from "react";

export interface ListingGridProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * The shared grid geometry for standard listing surfaces.
 *
 * Mobile keeps two readable columns. From `sm` onward the grid uses the same
 * tokenized minimum column as search, so legal pages, home loading states and
 * trend loading states do not invent different card widths.
 */
export const ListingGrid: React.FC<ListingGridProps> = ({
  children,
  className = "",
}) => (
  <div
    className={`listing-grid grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(var(--spacing-listing-grid-min),1fr))] sm:gap-4 ${className}`}
  >
    {children}
  </div>
);
