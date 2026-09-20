import React from "react";

export interface ListingGridProps {
  children: React.ReactNode;
  className?: string;
  /** One full-width result per row; pair with list-variant listing cards. */
  variant?: "grid" | "list";
}

/**
 * The shared grid geometry for standard listing surfaces.
 *
 * Mobile keeps one readable column. Desktop uses the same content-sized width
 * as rail cards and packs each row from the inline start without stretching an
 * individual card or distributing sparse results across the container.
 */
export const ListingGrid: React.FC<ListingGridProps> = ({
  children,
  className = "",
  variant = "grid",
}) => (
  <div
    data-listing-grid-variant={variant}
    className={`listing-grid grid grid-cols-1 gap-3 sm:gap-4 ${
      variant === "list"
        ? "listing-grid-list sm:grid-cols-1"
        : "sm:grid-cols-listing-grid-fixed sm:justify-start"
    } ${className}`}
  >
    {children}
  </div>
);
