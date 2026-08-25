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
 * fills each row with as many token-sized columns as the available space can
 * hold without shrinking the card below the shared dense-grid minimum.
 */
export const ListingGrid: React.FC<ListingGridProps> = ({
  children,
  className = "",
  fluid = false,
}) => (
  <div
    className={`listing-grid grid grid-cols-2 gap-3 sm:gap-4 ${
      fluid
        ? "listing-grid-fluid sm:grid-cols-listing-grid-fluid"
        : "sm:grid-cols-listing-grid-fixed sm:justify-start"
    } ${className}`}
  >
    {children}
  </div>
);
