import React from "react";
import { FileKey2, MapPin, Package, Truck } from "lucide-react";
import { Listing } from "../../../types";
import { useTranslation } from "../../../i18n/I18nProvider";
import { digitalMessagesFr } from "../../../i18n/digital.catalogue.fr";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";

export interface ListingFulfillmentSummaryProps {
  listing: Listing;
  className?: string;
}

export const ListingFulfillmentSummary: React.FC<
  ListingFulfillmentSummaryProps
> = ({ listing, className = "" }) => {
  const { t } = useTranslation(digitalMessagesFr);
  const { formatPrice } = useMarketLocation();
  const digitalTypes = (listing.fulfillmentTypes ?? []).filter(
    (type) => type !== "PHYSICAL",
  );
  const isDigital =
    listing.requiresPhysicalDelivery === false || digitalTypes.length > 0;

  if (isDigital) {
    const labels = digitalTypes.map((type) => {
      switch (type) {
        case "FILE_DOWNLOAD":
          return t("digital.fulfillment.file");
        case "ACCESS_LINK":
          return t("digital.fulfillment.link");
        case "ACCESS_CREDENTIALS":
          return t("digital.fulfillment.credentials");
        case "SELLER_PROVISIONED":
          return t("digital.fulfillment.provisioned");
        default:
          return t("digital.common.title");
      }
    });
    return (
      <div
        className={`rounded-3xl border border-primary-border bg-primary-surface-faint p-6 shadow-sm sm:p-8 ${className}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-text-inverse">
            <FileKey2 className="h-icon-md w-icon-md" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-main">
              {t("digital.common.title")}
            </h2>
            <p className="mt-1 text-sm font-bold text-primary">
              {t("digital.common.noShipping")}
            </p>
            {labels.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {labels.map((label) => (
                  <li
                    key={label}
                    className="rounded-full border border-primary-border bg-bg-surface px-3 py-1 text-xs font-bold text-text-main"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            ) : null}
            {listing.productVersion ? (
              <p className="mt-3 text-xs text-text-secondary">
                {t("digital.purchases.version", {
                  version: listing.productVersion,
                })}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const deliveryOpts = listing.deliveryOptions || [];
  const hasHandDelivery = deliveryOpts.some(
    (d) => d.type === "hand_delivery" && d.available,
  );
  const hasParcel = deliveryOpts.some(
    (d) =>
      (d.type === "relay_point" ||
        d.type === "home_delivery" ||
        d.type === "express") &&
      d.available,
  );
  const parcelPrices = deliveryOpts
    .filter(
      (delivery) =>
        (delivery.type === "relay_point" ||
          delivery.type === "home_delivery" ||
          delivery.type === "express") &&
        delivery.available &&
        typeof delivery.price === "number",
    )
    .map((delivery) => delivery.price as number);
  const parcelPrice = parcelPrices.length ? Math.min(...parcelPrices) : null;
  const hasBulky = deliveryOpts.some(
    (d) => (d.type === "custom_carrier" || d.type === "cocolis") && d.available,
  );

  // If no fulfillment modes apply (e.g. Real estate, jobs, digital services)
  if (!hasHandDelivery && !hasParcel && !hasBulky) {
    return null;
  }

  return (
    <div
      className={`bg-bg-surface rounded-3xl border border-border-disabled/60 p-6 sm:p-8 space-y-5 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-border-soft">
        <h2 className="text-base font-bold text-text-main">
          {t("listings.listingFulfillmentSummary.remiseExpedition")}
        </h2>
        <span className="text-xs text-text-tertiary font-medium bg-surface-soft px-2 py-1 rounded-md">
          {t("listings.listingFulfillmentSummary.choixDefinitifALaCommande")}
        </span>
      </div>

      <div className="space-y-3">
        {/* Hand Delivery */}
        {hasHandDelivery && (
          <div className="p-3.5 rounded-xl bg-bg-base/60 border border-border-base flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
                <MapPin className="w-icon-md h-icon-md" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-text-main">
                  Remise en main propre
                </div>
                <div className="text-micro text-text-tertiary">
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
                <Package className="w-icon-md h-icon-md" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-text-main">
                  {t(
                    "listings.listingFulfillmentSummary.livraisonEnColisAvecSuivi",
                  )}
                </div>
                <div className="text-micro text-text-tertiary">
                  {t(
                    "listings.listingFulfillmentSummary.mondialRelayPointRelaisLocker",
                  )}
                </div>
              </div>
            </div>
            {parcelPrice !== null ? (
              <div className="text-xs sm:text-sm font-bold text-text-main">
                {parcelPrice === 0
                  ? "Gratuit"
                  : formatPrice(parcelPrice, {
                      sourceCurrency: listing.currency,
                    })}
              </div>
            ) : null}
          </div>
        )}

        {/* Bulky Transport */}
        {hasBulky && (
          <div className="p-3.5 rounded-xl bg-bg-base/60 border border-border-base flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-warning-surface text-warning flex items-center justify-center shrink-0">
                <Truck className="w-icon-md h-icon-md" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-text-main">
                  {t(
                    "listings.listingFulfillmentSummary.transportDeMeublesGrosColis",
                  )}
                </div>
                <div className="text-micro text-text-tertiary">
                  {t(
                    "listings.listingFulfillmentSummary.livraisonParTransporteurSpecialiseCocolis",
                  )}
                </div>
              </div>
            </div>
            <div className="text-xs sm:text-sm font-bold text-text-main">
              {t("listings.listingFulfillmentSummary.surDevisTransport")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
