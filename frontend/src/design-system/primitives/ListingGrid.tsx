import React from "react";

export interface ListingGridProps {
  children: React.ReactNode;
  className?: string;
  /** Fill the available row with responsive columns instead of rail-width cards. */
  fluid?: boolean;
}

/**
 * The shared grid geometry for standard listing surfaces.
 *
 * Mobile keeps two readable columns. The default desktop layout uses the same
 * fixed width as rail cards. Result-heavy surfaces can opt into `fluid`, which
 * fills the row with three, four or five proportional columns.
 */
export const ListingGrid: React.FC<ListingGridProps> = ({
  children,
  className = "",
  fluid = false,
}) => (
  <div
    className={`listing-grid grid grid-cols-2 gap-3 sm:gap-4 ${
      fluid
        ? "listing-grid-fluid sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        : "sm:grid-cols-[repeat(auto-fill,var(--spacing-listing-card))] sm:justify-start"
    } ${className}`}
  >
    {children}
  </div>
);
