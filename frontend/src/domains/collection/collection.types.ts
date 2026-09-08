import type { Listing } from "../../types";

/** A collection is a live taxonomy branch backed by published API inventory. */
export interface Collection {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  coverImageUrl: string;
  tags: string[];
  listingCount: number;
  itemCountLabel: string;
}

export interface CollectionResolution {
  collection: Collection;
  listings: Listing[];
}
