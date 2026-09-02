import type { ListingCardView } from "@shongre/contracts";

export interface ListingPromotionBadge {
  label: string;
  tone: "urgent" | "featured";
  sponsored: boolean;
}

export function getListingPromotionBadges(
  listing: Pick<ListingCardView, "isUrgent" | "isFeatured"> &
    Partial<Pick<ListingCardView, "promotion" | "discovery">>,
): ListingPromotionBadge[] {
  if (listing.discovery?.isSponsored) {
    return [
      {
        label: listing.discovery.promotionLabel || "Sponsorisé",
        tone: "featured",
        sponsored: true,
      },
    ];
  }
  if (listing.promotion?.state === "active" && listing.promotion.type) {
    if (listing.promotion.type === "urgent_badge") {
      return [
        {
          label: listing.promotion.label || "Urgent",
          tone: "urgent",
          sponsored: false,
        },
      ];
    }
    const label =
      listing.promotion.label ||
      (listing.promotion.type === "search_bump" ? "Remonté" : "À la une");
    return [
      { label: `${label} · sponsorisé`, tone: "featured", sponsored: true },
    ];
  }
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
 * Keeps the two highest-priority taxonomy chips unique and removes values
 * already owned by a dedicated card field. The projection feeding this helper
 * owns category-specific ordering; full attributes remain available to detail
 * views. Condition stays out of compact taxonomy chips: native may present it
 * separately, while Web reserves the complete value for details.
 */
export function getListingCardCharacteristics(
  listing: Pick<ListingCardView, "characteristics" | "conditionLabel">,
): string[] {
  const condition = normalizeCharacteristic(listing.conditionLabel);
  const seen = new Set<string>();

  return listing.characteristics
    .filter((characteristic) => {
      const normalized = normalizeCharacteristic(characteristic);
      if (
        !normalized ||
        normalized === condition ||
        normalized.includes("currency_minor") ||
        seen.has(normalized)
      ) {
        return false;
      }
      seen.add(normalized);
      return true;
    })
    .slice(0, 2);
}
