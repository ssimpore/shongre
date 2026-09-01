import type { TaxonomyPrimaryCta } from "../taxonomy/taxonomy.types";

export type ListingSafetyVariant =
  | "payment"
  | "application"
  | "service"
  | "appointment"
  | "exchange"
  | "in_person";

export function resolveListingIntentPresentation(
  primaryCta: TaxonomyPrimaryCta | undefined,
  isOnlinePaymentAvailable: boolean,
) {
  const priceLabelKey = (() => {
    switch (primaryCta) {
      case "apply":
        return "listings.listingDetailPage.remuneration" as const;
      case "request_quote":
        return "listings.listingDetailPage.tarifIndicatif" as const;
      case "request_visit":
        return "listings.listingDetailPage.prixDuBien" as const;
      case "request_test_drive":
        return "listings.listingDetailPage.prixDuVehicule" as const;
      case "request_lesson":
        return "listings.listingDetailPage.tarifDuCours" as const;
      case "check_availability":
        return "listings.listingDetailPage.tarif" as const;
      case "propose_exchange":
        return "listings.listingDetailPage.valeurIndicative" as const;
      default:
        return "listings.listingDetailPage.prixDeLArticle" as const;
    }
  })();

  let safetyVariant: ListingSafetyVariant = "in_person";
  if (isOnlinePaymentAvailable) safetyVariant = "payment";
  else if (primaryCta === "apply") safetyVariant = "application";
  else if (primaryCta === "request_lesson" || primaryCta === "request_quote")
    safetyVariant = "service";
  else if (
    primaryCta === "request_visit" ||
    primaryCta === "request_test_drive" ||
    primaryCta === "check_availability"
  )
    safetyVariant = "appointment";
  else if (primaryCta === "propose_exchange") safetyVariant = "exchange";

  return { priceLabelKey, safetyVariant };
}
