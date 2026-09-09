import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  getMapTileOptions,
  getMapTileSource,
} from "../../platform/map/tile-source";

export interface MapCanvasCenter {
  latitude: number;
  longitude: number;
  zoom?: number;
}

export interface MapCanvasProps {
  /** Where the map opens. Layers added in `onReady` may then refit it. */
  center: MapCanvasCenter;
  /**
   * Called after the map exists and has a view. Add markers, circles and
   * handlers here and return a cleanup for them; the map itself is disposed by
   * this component.
   */
  onReady?: (map: L.Map) => void | (() => void);
  /**
   * Changing this re-centres the map and re-runs `onReady`, after cleaning up
   * what the previous run added. The map instance itself survives — recreating
   * it would tear the tiles down and rebuild them under the reader.
   */
  layerKey?: string | number;
  /** A detail page scrolls; grabbing the wheel over a map traps the reader. */
  scrollWheelZoom?: boolean;
  zoomControl?: boolean;
  /** `img` for a map that only shows a place, `region` when it can be driven. */
  role?: "img" | "region";
  ariaLabel: string;
  className?: string;
  /** Marks the surface in tests and analytics. */
  surface: string;
}

/**
 * A Leaflet map, once.
 *
 * Five surfaces each carried their own copy of "create the map, add the tile
 * layer, remove it on unmount" — the listing location map, the property map and
 * its location picker, the search results map and the explore map. The copies
 * had drifted: two of them passed `attributionControl: false`, which removed
 * the OpenStreetMap credit that is a *condition* of using those tiles, so the
 * product was serving unattributed tiles on two of its five maps.
 *
 * Centralising the lifecycle means the basemap, its attribution and the
 * disposal are decided in one place and cannot be half-applied. What each
 * surface actually draws stays with that surface, through `onReady`.
 */
export const MapCanvas: React.FC<MapCanvasProps> = ({
  center,
  onReady,
  layerKey,
  scrollWheelZoom = false,
  zoomControl = true,
  role = "region",
  ariaLabel,
  className = "",
  surface,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const onReadyRef = useRef(onReady);
  const centerRef = useRef(center);
  onReadyRef.current = onReady;
  centerRef.current = center;

  /*
   * No configured provider means no tiles, and a Leaflet frame with zoom
   * buttons over an empty grey square reads as a broken feature rather than an
   * absent one. Nothing is rendered instead.
   */
  const tileSource = getMapTileSource();
  const hasTiles = Boolean(tileSource.url);

  useEffect(() => {
    if (!hasTiles || !containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl,
      // Never false. The tiles are OpenStreetMap's and the credit travels with
      // them; a map without it is a licence breach, not a design choice.
      attributionControl: true,
      scrollWheelZoom,
    });
    L.tileLayer(tileSource.url, getMapTileOptions()).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Created once; callers move it through the handle `onReady` gives them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    /*
     * The view is set before anything is added: a Leaflet layer cannot report
     * its bounds until the map has a projection to report them in, so a caller
     * that adds a circle and fits to it throws unless a view already exists.
     */
    const { latitude, longitude, zoom } = centerRef.current;
    map.setView([latitude, longitude], zoom ?? 13);
    return onReadyRef.current?.(map);
    // `layerKey` is the caller's statement that what it draws has changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerKey]);

  if (!hasTiles) return null;

  return (
    <div
      ref={containerRef}
      data-map-canvas={surface}
      role={role}
      aria-label={ariaLabel}
      className={`leaflet-container ${className}`}
    />
  );
};
