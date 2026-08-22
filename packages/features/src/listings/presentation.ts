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

function normalizeCharacteristic(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("fr-FR");
}

/**
 * Keeps taxonomy chips unique and removes values already owned by a dedicated
 * card field. In particular, condition has its own line above the chips on
 * both web and native cards.
 */
export function getListingCardCharacteristics(
  listing: Pick<ListingCardView, "characteristics" | "conditionLabel">,
): string[] {
  const condition = normalizeCharacteristic(listing.conditionLabel);
  const seen = new Set<string>();

  return listing.characteristics.filter((characteristic) => {
    const normalized = normalizeCharacteristic(characteristic);
    if (!normalized || normalized === condition || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}
