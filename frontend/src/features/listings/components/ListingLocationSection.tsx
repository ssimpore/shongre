import React, { Suspense } from "react";
import { DetailSection } from "../../../design-system/primitives/DetailFacts";
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
  className = "",
}) => {
  const { t } = useTranslation();
  const place = [city, postalCode ? `(${postalCode})` : null]
    .filter(Boolean)
    .join(" ");
  if (!place) return null;

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
      {hasCoordinates(latitude, longitude) ? (
        <Suspense
          fallback={
            <div
              aria-hidden="true"
              className="skeleton-shimmer h-96 w-full rounded-card border border-border-soft bg-bg-surface"
            />
          }
        >
          <ListingLocationMap
            latitude={latitude}
            longitude={longitude!}
            approximateRadiusMetres={
              (precision ? RADIUS_BY_PRECISION[precision] : undefined) ??
              DEFAULT_RADIUS_METRES
            }
            accessibleLabel={t("listings.characteristics.mapLabel", { place })}
          />
        </Suspense>
      ) : null}
    </DetailSection>
  );
};
