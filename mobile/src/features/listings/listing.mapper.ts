import { listingCardSchema, type ListingCardView } from "@shongre/contracts";

export interface BackendListing {
  id: string;
  title: string;
  price: number;
  currency?: string;
  images?: string[];
  city?: string;
  marketCode?: string;
  condition?: string;
  categoryLabel?: string;
  createdAt?: string;
  deliveryAvailable?: boolean;
  onlinePaymentAvailable?: boolean;
  isUrgent?: boolean;
  isFeatured?: boolean;
  seller?: {
    id: string;
    name: string;
    sellerType?: "individual" | "pro";
    city?: string;
    isIdentityVerified?: boolean;
    rating?: number;
    reviewCount?: number;
  };
}

export function mapBackendListing(item: BackendListing): ListingCardView {
  return listingCardSchema.parse({
    id: item.id,
    title: item.title,
    price: {
      amountMinor: Math.round(Number(item.price) * 100),
      currency: item.currency || "EUR",
    },
    imageUrl: item.images?.[0],
    photoCount: item.images?.length ?? 0,
    city: item.city || "France",
    marketCode: item.marketCode || "FR",
    categoryLabel: item.categoryLabel,
    conditionLabel: item.condition || "Bon état",
    publishedAt: item.createdAt || "2026-08-01T10:00:00.000Z",
    deliveryAvailable: Boolean(item.deliveryAvailable),
    onlinePaymentAvailable: Boolean(item.onlinePaymentAvailable),
    seller: item.seller
      ? {
          id: item.seller.id,
          name: item.seller.name,
          sellerType: item.seller.sellerType || "individual",
          city: item.seller.city,
          isIdentityVerified: Boolean(item.seller.isIdentityVerified),
          rating: item.seller.rating,
          reviewCount: item.seller.reviewCount,
        }
      : undefined,
    isUrgent: Boolean(item.isUrgent),
    isFeatured: Boolean(item.isFeatured),
  });
}
