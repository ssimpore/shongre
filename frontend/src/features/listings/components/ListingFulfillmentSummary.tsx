import React from "react";
import { MapPin, Package, Truck, Store } from "lucide-react";
import { Listing } from "../../../types";
import { fulfillmentResolver } from "../../../domains/fulfillment/fulfillment.resolver";
import { TaxonomyMigration } from "../../../domains/taxonomy/taxonomy.migration";
import { useTranslation } from "../../../i18n/I18nProvider";

export interface ListingFulfillmentSummaryProps {
  listing: Listing;
  className?: string;
}

export const ListingFulfillmentSummary: React.FC<
  ListingFulfillmentSummaryProps
> = ({ listing, className = "" }) => {
  const { t } = useTranslation();
  const caps = fulfillmentResolver.resolveCapabilities({
    taxonomyNodeId:
      TaxonomyMigration.resolveCanonicalNode(
        listing.subCategorySlug || listing.categorySlug,
      )?.id ||
      listing.subCategorySlug ||
      listing.categorySlug,
    sellerType: listing.sellerType,
    price: listing.price,
  });

  const deliveryOpts = listing.deliveryOptions || [];
  const hasHandDelivery =
    caps.allowHandDelivery &&
    deliveryOpts.some((d) => d.type === "hand_delivery" && d.available);
  const hasParcel =
    caps.allowParcelShipping &&
    deliveryOpts.some(
      (d) =>
        (d.type === "relay_point" || d.type === "home_delivery") && d.available,
    );
  const hasBulky =
    caps.allowBulkyDelivery &&
    deliveryOpts.some((d) => d.type === "custom_carrier" && d.available);
  const hasStorePickup = caps.allowStorePickup && listing.sellerType === "pro";

  // If no fulfillment modes apply (e.g. Real estate, jobs, digital services)
  if (!hasHandDelivery && !hasParcel && !hasBulky && !hasStorePickup) {
    return null;
  }

  return (
    <div
      className={`bg-white rounded-3xl border border-stone-200/60 p-6 sm:p-8 space-y-5 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
        <h2 className="text-base font-black text-stone-900">
          {t("listings.listingFulfillmentSummary.remiseExpedition")}
        </h2>
        <span className="text-xs text-stone-500 font-medium bg-stone-50 px-2 py-1 rounded-md">
          {t("listings.listingFulfillmentSummary.choixDefinitifALaCommande")}
        </span>
      </div>

      <div className="space-y-3">
        {/* Hand Delivery */}
        {hasHandDelivery && (
          <div className="p-3.5 rounded-xl bg-bg-base/60 border border-border-base flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-stone-900">
                  Remise en main propre
                </div>
                <div className="text-micro text-stone-500">
                  À convenir à {listing.city} ({listing.postalCode}) •
                  Validation par code secret PIN
                </div>
              </div>
            </div>
            <div className="text-xs sm:text-sm font-bold text-success">
              Gratuit
            </div>
          </div>
        )}

        {/* Parcel Shipping */}
        {hasParcel && (
          <div className="p-3.5 rounded-xl bg-bg-base/60 border border-border-base flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-info-surface text-info flex items-center justify-center shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-stone-900">
                  {t(
                    "listings.listingFulfillmentSummary.livraisonEnColisAvecSuivi",
                  )}
                </div>
                <div className="text-micro text-stone-500">
                  {t(
                    "listings.listingFulfillmentSummary.mondialRelayPointRelaisLocker",
                  )}
                </div>
              </div>
            </div>
            <div className="text-xs sm:text-sm font-bold text-stone-900">
              {t("listings.listingFulfillmentSummary.aPartirDe399")}
            </div>
          </div>
        )}

        {/* Bulky Transport */}
        {hasBulky && (
          <div className="p-3.5 rounded-xl bg-bg-base/60 border border-border-base flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-warning-surface text-warning flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-stone-900">
                  {t(
                    "listings.listingFulfillmentSummary.transportDeMeublesGrosColis",
                  )}
                </div>
                <div className="text-micro text-stone-500">
                  {t(
                    "listings.listingFulfillmentSummary.livraisonParTransporteurSpecialiseCocolis",
                  )}
                </div>
              </div>
            </div>
            <div className="text-xs sm:text-sm font-bold text-stone-900">
              {t("listings.listingFulfillmentSummary.surDevisTransport")}
            </div>
          </div>
        )}

        {/* Store Pickup (Pro) */}
        {hasStorePickup && (
          <div className="p-3.5 rounded-xl bg-bg-base/60 border border-border-base flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-success-surface text-success flex items-center justify-center shrink-0">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-stone-900">
                  Retrait en boutique
                </div>
                <div className="text-micro text-stone-500">
                  {t(
                    "listings.listingFulfillmentSummary.retraitDirectDansLeMagasin",
                  )}
                </div>
              </div>
            </div>
            <div className="text-xs sm:text-sm font-bold text-success">
              Gratuit
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
