import { Collection, CollectionFilterCriteria } from './collection.types';
import { ALL_COLLECTIONS, COLLECTION_PILLARS, getCollectionBySlug, getCollectionsByPillar } from './collection.data';
import { Listing } from '../../types';
import { isProSeller } from '../user/user.domain';

export class CollectionService {
  /**
   * Returns all available collection pillars.
   */
  getPillars() {
    return COLLECTION_PILLARS;
  }

  /**
   * Returns all collections, optionally filtered by pillar ID.
   */
  getCollections(pillarId: string = 'all'): Collection[] {
    return getCollectionsByPillar(pillarId);
  }

  /**
   * Returns a single collection by its slug or ID.
   */
  getCollection(slug: string): Collection | undefined {
    return getCollectionBySlug(slug);
  }

  /**
   * Evaluates and filters a list of listings against a collection's criteria.
   */
  filterListingsForCollection(
    collection: Collection,
    allListings: Listing[],
    options: { allowFallback?: boolean } = {}
  ): Listing[] {
    if (!allListings || allListings.length === 0) return [];
    const { filterCriteria, featuredListingIds } = collection;

    // Filter active listings only
    const active = allListings.filter((l) => l && l.status === 'active');

    const matched = active.filter((listing) => {
      // 1. Check explicit featured listing IDs
      if (featuredListingIds && featuredListingIds.includes(listing.id)) {
        return true;
      }

      // 2. Free Donation check
      if (filterCriteria.isFreeDonation !== undefined) {
        if (filterCriteria.isFreeDonation && !listing.isFreeDonation && listing.price > 0) {
          return false;
        }
      }

      // 3. Price bounds
      if (filterCriteria.priceMax !== undefined && listing.price > filterCriteria.priceMax) {
        return false;
      }
      if (filterCriteria.priceMin !== undefined && listing.price < filterCriteria.priceMin) {
        return false;
      }

      // 4. Discount check
      if (filterCriteria.isDiscounted) {
        const hasDiscount = listing.originalPrice && listing.originalPrice > listing.price;
        if (!hasDiscount) return false;
      }

      // 5. Pro seller only
      if (filterCriteria.isProOnly && !isProSeller(listing)) {
        return false;
      }

      // 6. Boosted only
      if (filterCriteria.isBoostedOnly && !listing.isBoosted) {
        return false;
      }

      // 7. Delivery available
      if (filterCriteria.hasDelivery) {
        const hasDelivery = listing.deliveryOptions?.some(
          (opt) => opt.available && opt.type !== 'hand_delivery'
        );
        if (!hasDelivery) return false;
      }

      // 8. Condition check
      if (filterCriteria.conditions && filterCriteria.conditions.length > 0) {
        if (!listing.condition || !filterCriteria.conditions.includes(listing.condition)) {
          return false;
        }
      }

      // 9. Category match
      if (filterCriteria.categorySlug) {
        const matchesCat =
          listing.categorySlug === filterCriteria.categorySlug ||
          listing.categoryLabel?.toLowerCase().includes(filterCriteria.categorySlug.toLowerCase());
        if (!matchesCat) return false;
      }

      // 10. Keyword match (if specified)
      if (filterCriteria.keywords && filterCriteria.keywords.length > 0) {
        const titleLower = listing.title.toLowerCase();
        const descLower = listing.description?.toLowerCase() || '';
        const catLower = listing.categoryLabel?.toLowerCase() || '';

        const matchesAnyKeyword = filterCriteria.keywords.some((kw) => {
          const kwLower = kw.toLowerCase();
          return (
            titleLower.includes(kwLower) ||
            descLower.includes(kwLower) ||
            catLower.includes(kwLower)
          );
        });

        if (!matchesAnyKeyword) return false;
      }

      return true;
    });

    if (options.allowFallback && matched.length < 2) {
      const fallback = active.slice(0, 6);
      return Array.from(new Set([...matched, ...fallback]));
    }

    return matched;
  }
}

export const collectionService = new CollectionService();
