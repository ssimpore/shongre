import React, { Suspense } from "react";
import { DeferUntilVisible } from "../../../design-system/primitives/DeferUntilVisible";
import { DetailSection } from "../../../design-system/primitives/DetailFacts";
import { resolveApproximatePlace } from "@shongre/contracts/place-gazetteer";
import { useTranslation } from "../../../i18n/I18nProvider";

const ListingLocationMap = React.lazy(() =>
  import("./ListingLocationMap").then((module) => ({
    default: module.ListingLocationMap,
  })),
);

export interface ListingLocationSectionProps {
  city?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** How precise the published coordinate is, when the API declares it. */
  precision?: LocationPrecision | null;
  /** Scopes the city gazetteer used when the API published no coordinate. */
  marketCode?: string;
  className?: string;
}

/**
 * How far out the disc is drawn, in metres, per published precision.
 *
 * The API says how precise its coordinate is; the drawing has to say the same
 * thing. An `exact` address is still drawn as a neighbourhood rather than a
 * doorstep, because a public listing page is not where a seller agreed to
 * publish where they live.
 */
const RADIUS_BY_PRECISION: Readonly<Record<string, number>> = {
  exact: 400,
  street: 500,
  district: 900,
  city: 2_000,
};
const DEFAULT_RADIUS_METRES = 700;

export type LocationPrecision = keyof typeof RADIUS_BY_PRECISION | string;

function hasCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): latitude is number {
  if (
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude)
  ) {
    return false;
  }
  // Out of range is not a location, it is bad data.
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return false;
  /*
   * Exactly (0, 0) is the placeholder the API writes when it has no coordinate
   * to publish, not a place. Accepting it drew a Lyon property in the Gulf of
   * Guinea — an answer far more confidently wrong than showing no map at all,
   * and no Shongre market is within a thousand kilometres of it.
   */
  if (latitude === 0 && longitude === 0) return false;
  return true;
}

/**
 * Where a listing is.
 *
 * The place name is shown whenever it exists, because it is what a reader
 * actually needs. The map is shown only when the public projection published
 * coordinates — a listing without them gets no map rather than a pin dropped at
 * the middle of the market, which would be an invented answer to the one
 * question this section exists to answer.
 */
export const ListingLocationSection: React.FC<ListingLocationSectionProps> = ({
  city,
  postalCode,
  latitude,
  longitude,
  precision,
  marketCode,
  className = "",
}) => {
  const { t } = useTranslation();
  /*
   * Most listings publish a town and a postcode but no coordinate — a seller
   * types where they are, and nothing geocodes it, because the geocoding
   * capability is declared and not yet implemented. So the section showed a
   * place name and an empty space where the map should be, on the majority of
   * the catalogue.
   *
   * The town itself is a location, and the app already keeps a market-scoped
   * city gazetteer for its search maps. Using it means a listing in Biarritz is
   * drawn over Biarritz. It resolves to nothing for a town it does not know,
   * and it is never allowed to fall back to the market centre — a surfboard in
   * the Basque Country pinned near Paris would be worse than no map, which is
   * the same rule that keeps (0, 0) off these maps.
   */
  const fallback =
    !hasCoordinates(latitude, longitude) && city
      ? resolveApproximatePlace({ city, marketCode })
      : null;
  const drawnLatitude = hasCoordinates(latitude, longitude)
    ? latitude
    : fallback?.latitude;
  const drawnLongitude = hasCoordinates(latitude, longitude)
    ? longitude
    : fallback?.longitude;
  /*
   * A town centre is a town-sized answer, so it is drawn at town scale whatever
   * precision the entity claims. Overstating it would turn "somewhere in
   * Biarritz" into "this street in Biarritz".
   */
  const drawnPrecision = fallback ? "city" : precision;
  const place = [city, postalCode ? `(${postalCode})` : null]
    .filter(Boolean)
    .join(" ");
  if (!place) return null;

  // Same footprint as the map, so neither the deferral nor the chunk load
  // moves anything below it.
  const mapPlaceholder = (
    <div
      aria-hidden="true"
      className="skeleton-shimmer h-96 w-full rounded-listing-card border border-border-soft bg-bg-surface"
    />
  );

  return (
    <DetailSection
      title={t("listings.characteristics.location")}
      className={className}
      subtitle={
        <p
          data-listing-location-place="true"
          className="text-base font-bold text-text-main"
        >
          {place}
        </p>
      }
    >
      {hasCoordinates(drawnLatitude, drawnLongitude) ? (
        /*
         * The renderer is far larger than the rest of the page and this section
         * sits below the description, the characteristics and the seller. A
         * lazy import alone still fetched it — and its worker, and the first
         * tiles — on every detail view; the slot has to be on screen first.
         */
        <DeferUntilVisible
          data-testid="listing-location-map-slot"
          fallback={mapPlaceholder}
        >
          <Suspense fallback={mapPlaceholder}>
            <ListingLocationMap
              latitude={drawnLatitude}
              longitude={drawnLongitude!}
              approximateRadiusMetres={
                (drawnPrecision
                  ? RADIUS_BY_PRECISION[drawnPrecision]
                  : undefined) ?? DEFAULT_RADIUS_METRES
              }
              accessibleLabel={t("listings.characteristics.mapLabel", {
                place,
              })}
            />
          </Suspense>
        </DeferUntilVisible>
      ) : null}
    </DetailSection>
  );
};
