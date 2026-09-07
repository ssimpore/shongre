import { Principal, requireOwnership } from "../../../shared/auth/principal.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { listingsService } from "../listings.service.js";
import { publisherEntitlementsService } from "../../publishers/publisher-entitlements.service.js";

export async function assertListingOwnership(
  principal: Principal,
  listingId: string | undefined,
): Promise<void> {
  if (!listingId) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Identifiant d’annonce manquant.",
    });
  }
  const listing = await listingsService.getInternalListingById(listingId);
  if (!listing) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Annonce introuvable.",
    });
  }
  if (
    await publisherEntitlementsService.canManageListing(
      principal.userId,
      listing,
    )
  ) {
    return;
  }
  requireOwnership(principal, listing.sellerId, "listing.moderate");
}
