import React from "react";
import L from "leaflet";
import { MapCanvas } from "../../../design-system/primitives/MapCanvas";

export interface ListingLocationMapProps {
  latitude: number;
  longitude: number;
  /** Metres. The area the listing is within, never its exact address. */
  approximateRadiusMetres: number;
  /** Names the area for assistive technology, since the map itself cannot. */
  accessibleLabel: string;
}

/**
 * The approximate area a listing is in.
 *
 * Deliberately a disc rather than a pin at a precise point: the public
 * projection publishes an approximate location, and a single marker would
 * present it as an address the seller never agreed to share. The disc is the
 * honest rendering of what the data actually means, and it is also what stops a
 * reader inferring a doorstep from a rounded coordinate.
 *
 * Loaded lazily by its section — the tile renderer is far larger than the rest
 * of a detail page and most visitors never scroll to it.
 */
export const ListingLocationMap: React.FC<ListingLocationMapProps> = ({
  latitude,
  longitude,
  approximateRadiusMetres,
  accessibleLabel,
}) => (
  <MapCanvas
    surface="listing-location"
    center={{ latitude, longitude, zoom: 14 }}
    layerKey={`${latitude},${longitude},${approximateRadiusMetres}`}
    role="img"
    ariaLabel={accessibleLabel}
    className="h-96 w-full overflow-hidden rounded-card border border-border-base"
    onReady={(map) => {
      const circle = L.circle([latitude, longitude], {
        radius: approximateRadiusMetres,
        weight: 0,
        fillOpacity: 0.25,
      }).addTo(map);
      map.fitBounds(circle.getBounds(), { padding: [24, 24] });
      return () => circle.remove();
    }}
  />
);
