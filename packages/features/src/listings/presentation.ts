import type { ListingCardView } from "@shongre/contracts";

export interface ListingPromotionBadge {
  label: string;
  tone: "urgent" | "featured";
  sponsored: boolean;
}

export function getListingPromotionBadges(
  listing: Pick<ListingCardView, "isUrgent" | "isFeatured">,
): ListingPromotionBadge[] {
  return [
    ...(listing.isUrgent
      ? [{ label: "Urgent", tone: "urgent" as const, sponsored: false }]
      : []),
    ...(listing.isFeatured
      ? [
          {
            label: "À la une · sponsorisé",
            tone: "featured" as const,
            sponsored: true,
          },
        ]
      : []),
  ];
}

export function listingAccessibilityLabel(
  listing: ListingCardView,
  formattedPrice: string,
): string {
  return [
    listing.title,
    formattedPrice,
    listing.conditionLabel,
    listing.city,
    listing.seller?.name,
    listing.deliveryAvailable ? "Livraison disponible" : undefined,
  ]
    .filter(Boolean)
    .join(", ");
}
