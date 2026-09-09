import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MAP_TILE_OPTIONS,
  MAP_TILE_URL,
} from "../../../platform/map/tile-source";

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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
      // A detail page scrolls; grabbing the wheel over the map traps the reader.
      scrollWheelZoom: false,
    });
    L.tileLayer(MAP_TILE_URL, MAP_TILE_OPTIONS).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // A layer cannot report bounds until the map has a view to project them
    // onto, so the centre is set before the disc is added and only then fitted.
    map.setView([latitude, longitude], 14);
    const circle = L.circle([latitude, longitude], {
      radius: approximateRadiusMetres,
      weight: 0,
      fillOpacity: 0.25,
    }).addTo(map);
    map.fitBounds(circle.getBounds(), { padding: [24, 24] });
    return () => {
      circle.remove();
    };
  }, [latitude, longitude, approximateRadiusMetres]);

  return (
    <div
      ref={containerRef}
      data-listing-location-map="true"
      role="img"
      aria-label={accessibleLabel}
      className="h-96 w-full overflow-hidden rounded-card border border-border-base"
    />
  );
};
