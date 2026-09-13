import type { TaxonomyPrimaryCta } from "../taxonomy/taxonomy.types";
import type { TaxonomyV1ListingIntent } from "@shongre/contracts/taxonomy";

export type ListingSafetyVariant =
  | "payment"
  | "application"
  | "service"
  | "appointment"
  | "exchange"
  | "in_person";

/** Preserve the publication intent when a listing uses the generic page. */
export function primaryCtaForListingIntent(
  intent: TaxonomyV1ListingIntent | undefined,
): TaxonomyPrimaryCta {
  switch (intent) {
    case "JOB_OFFER":
      return "apply";
    case "SERVICE_OFFER":
    case "SERVICE_REQUEST":
      return "request_quote";
    case "COURSE_OFFER":
      return "request_lesson";
    case "RENT_OUT":
    case "RENT_SEEK":
    case "BOOK":
      return "check_availability";
    case "EXCHANGE":
      return "propose_exchange";
    default:
      return "contact_seller";
  }
}

export function resolveListingIntentPresentation(
  primaryCta: TaxonomyPrimaryCta | undefined,
  isOnlinePaymentAvailable: boolean,
) {
  const actionLabelKey = (() => {
    switch (primaryCta) {
      case "apply":
        return "listings.listingDetailPage.postuler" as const;
      case "request_quote":
        return "listings.listingDetailPage.demanderUnDevis" as const;
      case "request_visit":
        return "listings.listingDetailPage.demanderUneVisite" as const;
      case "request_test_drive":
        return "listings.listingDetailPage.demanderUnEssai" as const;
      case "request_lesson":
        return "listings.listingDetailPage.demanderUnCours" as const;
      case "check_availability":
        return "listings.listingDetailPage.verifierLaDisponibilite" as const;
      case "propose_exchange":
        return "listings.listingDetailPage.proposerUnEchange" as const;
      default:
        return "listings.listingDetailPage.message" as const;
    }
  })();
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

  return { actionLabelKey, priceLabelKey, safetyVariant };
}
