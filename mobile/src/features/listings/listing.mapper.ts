import { listingCardSchema, type ListingCardView } from "@shongre/contracts";

export interface BackendListing {
  id: string;
  title: string;
  price: number;
  currency: string;
  images?: string[];
  city: string;
  marketCode: string;
  condition: string;
  categoryLabel?: string;
  createdAt: string;
  deliveryAvailable?: boolean;
  onlinePaymentAvailable?: boolean;
  fulfillmentTypes?: import("@shongre/contracts/digital-products").FulfillmentType[];
  requiresPhysicalDelivery?: boolean;
  productVersion?: string;
  isUrgent?: boolean;
  isFeatured?: boolean;
  seller?: {
    id: string;
    name: string;
    sellerType?: "individual" | "pro";
    city?: string;
    isIdentityVerified?: boolean;
    isBusinessVerified?: boolean;
    organizationName?: string;
    organizationLogoUrl?: string;
    branchName?: string;
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
      currency: item.currency,
    },
    imageUrl: item.images?.[0],
    photoCount: item.images?.length ?? 0,
    city: item.city,
    marketCode: item.marketCode,
    categoryLabel: item.categoryLabel,
    conditionLabel: item.condition,
    publishedAt: item.createdAt,
    deliveryAvailable: Boolean(item.deliveryAvailable),
    fulfillmentTypes: item.fulfillmentTypes,
    requiresPhysicalDelivery: item.requiresPhysicalDelivery,
    productVersion: item.productVersion,
    onlinePaymentAvailable: Boolean(item.onlinePaymentAvailable),
    seller: item.seller
      ? {
          id: item.seller.id,
          name: item.seller.name,
          sellerType: item.seller.sellerType || "individual",
          city: item.seller.city,
          isIdentityVerified: Boolean(item.seller.isIdentityVerified),
          isBusinessVerified: Boolean(item.seller.isBusinessVerified),
          organizationName: item.seller.organizationName,
          organizationLogoUrl: item.seller.organizationLogoUrl,
          branchName: item.seller.branchName,
          rating: item.seller.rating,
          reviewCount: item.seller.reviewCount,
        }
      : undefined,
    isUrgent: Boolean(item.isUrgent),
    isFeatured: Boolean(item.isFeatured),
  });
}
