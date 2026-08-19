export type CollectionPillarId =
  | 'all'
  | 'editorial'
  | 'budget'
  | 'style'
  | 'lifestyle'
  | 'mobility'
  | 'local'
  | 'personalized';

export interface CollectionPillar {
  id: CollectionPillarId;
  label: string;
  shortLabel: string;
  iconName: string;
  description: string;
}

export interface CollectionFilterCriteria {
  priceMax?: number;
  priceMin?: number;
  isFreeDonation?: boolean;
  isDiscounted?: boolean;
  isProOnly?: boolean;
  isBoostedOnly?: boolean;
  hasDelivery?: boolean;
  conditions?: string[];
  categorySlug?: string;
  subCategorySlug?: string;
  keywords?: string[];
  brands?: string[];
  featuredListingIds?: string[];
}

export interface Collection {
  id: string;
  slug: string;
  pillarId: CollectionPillarId;
  title: string;
  shortTitle: string;
  subtitle: string;
  description: string;
  curatorNote: string;
  badge: {
    label: string;
    variant: 'terracotta' | 'emerald' | 'sky' | 'amber' | 'purple' | 'rose' | 'indigo';
  };
  itemCountLabel: string;
  coverImageUrl: string;
  tags: string[];
  filterCriteria: CollectionFilterCriteria;
  featuredListingIds?: string[];
}
