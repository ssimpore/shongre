/**
 * Bounded page sizes used by frontend service queries.
 *
 * Keeping these values outside route components prevents visually equivalent
 * result surfaces from drifting and makes future API limits a single adapter
 * migration rather than a page-by-page change.
 */
export const PAGE_SIZES = {
  notificationCenter: 100,
  notificationPreview: 8,
  marketplaceSearch: 24,
  verticalSearch: 20,
  similarListings: 5,
  similarVerticalListings: 4,
  homepagePromotedListings: 50,
  collectionListings: 60,
  adminFinanceRows: 25,
  adminFinanceExportRows: 1_000,
} as const;
