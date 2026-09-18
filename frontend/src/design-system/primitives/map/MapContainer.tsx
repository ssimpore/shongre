import React, { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  NavigationControl,
  getVersion,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapConfig, hasMapStyle } from "../../../platform/map/map-source";

/**
 * Where MapLibre finds its own worker.
 *
 * The library resolves it from `import.meta.url`, which webpack replaces at
 * build time with the module's path *on the build machine* — a `file:` URL the
 * browser cannot fetch. The failure is silent and looks like success: the map
 * is interactive and its raster fallback paints, while not one vector tile
 * arrives, so the style never finishes loading and no marker any surface adds
 * is ever drawn.
 *
 * `frontend/scripts/sync-map-worker.mjs` copies the worker out of the installed
 * package into `public/vendor/maplibre-gl/<version>/` on every build, so this
 * path is same-origin and always matches the installed version. The version
 * in the path is the one this very module reports, which is what lets the
 * files be served as immutable: a new MapLibre is a new URL.
 */
const WORKER_URL = `/vendor/maplibre-gl/${getVersion()}/maplibre-gl-worker.mjs`;

export interface MapContainerCenter {
  latitude: number;
  longitude: number;
  zoom?: number;
}

export interface MapContainerProps {
  /** Where the map opens. Layers added in `onReady` may then refit it. */
  center?: MapContainerCenter;
  /**
   * Called once the style has loaded and the map can accept layers. Add
   * markers, sources and handlers here and return a cleanup for them; the map
   * itself is disposed by this component.
   */
  onReady?: (map: MapLibreMap) => void | (() => void);
  /**
   * Changing this re-centres the map and re-runs `onReady`, after cleaning up
   * what the previous run added. The map instance itself survives — recreating
   * it would tear down the style and refetch every tile under the reader.
   */
  layerKey?: string | number;
  /** A detail page scrolls; grabbing the wheel over a map traps the reader. */
  scrollZoom?: boolean;
  navigationControl?: boolean;
  /** `img` for a map that only shows a place, `region` when it can be driven. */
  role?: "img" | "region";
  ariaLabel: string;
  className?: string;
  /** Marks the surface in tests and analytics. */
  surface: string;
  /** Rendered instead of the map when the style cannot be drawn. */
  fallback?: React.ReactNode;
}

/**
 * A MapLibre map, once.
 *
 * Five surfaces each carried their own copy of "create the map, add the basemap,
 * remove it on unmount" — the listing location map, the property map and its
 * location picker, the search results map and the explore map. The copies had
 * drifted: two of them disabled the attribution control, which removed the
 * OpenStreetMap credit that is a *condition* of using the data, so the product
 * was serving unattributed maps on two of its five surfaces.
 *
 * Centralising the lifecycle means the basemap, its attribution and the
 * disposal are decided in one place and cannot be half-applied. What each
 * surface draws stays with that surface, through `onReady`.
 *
 * This module statically imports MapLibre, which is large. That is safe only
 * because every consumer is reached through `React.lazy`, so a page with no
 * visible map never downloads it. Importing this from an eagerly-loaded module
 * would put the whole renderer in the initial bundle.
 */
export const MapContainer: React.FC<MapContainerProps> = ({
  center,
  onReady,
  layerKey,
  scrollZoom = false,
  navigationControl = true,
  role = "region",
  ariaLabel,
  className = "",
  surface,
  fallback = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onReadyRef = useRef(onReady);
  const centerRef = useRef(center);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  /* Read by the error handler, which is registered once and cannot see the
     current value of `status`. */
  const hasBecomeReadyRef = useRef(false);
  onReadyRef.current = onReady;
  centerRef.current = center;

  const config = getMapConfig();
  const canDraw = hasMapStyle();

  useEffect(() => {
    if (!canDraw || !containerRef.current || mapRef.current) return;
    setWorkerUrl(WORKER_URL);
    const opening = centerRef.current;
    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: config.styleUrl,
        center: [
          opening?.longitude ?? config.defaultCenter.longitude,
          opening?.latitude ?? config.defaultCenter.latitude,
        ],
        zoom: opening?.zoom ?? config.defaultZoom,
        minZoom: config.minZoom,
        maxZoom: config.maxZoom,
        scrollZoom,
        // Never removed. The basemap is OpenStreetMap-derived and the credit
        // travels with it; a map without it is a licence breach, not a style.
        attributionControl: { compact: true },
        // A reader who has asked for less motion has asked for less motion.
        // MapLibre's easing would otherwise animate every programmatic move.
        fadeDuration: prefersReducedMotion() ? 0 : 300,
      });
    } catch {
      setStatus("error");
      return;
    }
    if (navigationControl) {
      map.addControl(
        new NavigationControl({ showCompass: false }),
        "top-right",
      );
    }
    map.on("error", (event) => {
      /*
       * A missing sprite or one failed tile is not a broken map; a style that
       * never parses is. `isStyleLoaded()` cannot tell them apart — it stays
       * false for as long as any source is still loading, so testing it here
       * would turn the first slow tile into the error fallback and unmount a
       * working map. Whether readiness was ever reached is the honest signal.
       */
      if (!hasBecomeReadyRef.current) setStatus("error");
      if (process.env.NODE_ENV !== "production") console.warn(event.error);
    });

    /*
     * Readiness is "the style can accept layers", not "the map has finished
     * drawing".
     *
     * `load` sounds like the right event and is not: it waits for the first
     * *visually complete* render, which never arrives if the container spends
     * a frame at zero height — which is exactly what a map inside a lazily
     * mounted panel does. The observed symptom was a fully interactive map,
     * tiles painted, on which no marker ever appeared, because the callback
     * that adds them was waiting behind an event that had not fired.
     *
     * `styledata` fires as soon as the style is parsed, which is the condition
     * `addLayer` and `addSource` actually require.
     */
    /*
     * Ready means "the style is parsed", not "every tile has arrived".
     *
     * The two obvious candidates are both wrong here. `load` waits for the
     * first *visually complete* render, which never arrives if the container
     * spends a frame at zero height — which is exactly what a map inside a
     * lazily mounted panel does. `isStyleLoaded()` is stricter still: it also
     * requires every source to have finished, so one slow or stalled tile
     * source holds it false indefinitely.
     *
     * Neither is what a caller needs. `addSource` and `addLayer` require the
     * style document to be parsed, and a marker — a positioned DOM element —
     * requires nothing at all. `styledata` is that moment, and gating on
     * anything later is how a fully interactive map ends up with no markers
     * on it.
     */
    const markReady = () => {
      map.off("styledata", markReady);
      hasBecomeReadyRef.current = true;
      setStatus("ready");
    };
    map.on("styledata", markReady);
    map.once("load", markReady);
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
    if (!map || status !== "ready") return;
    const opening = centerRef.current;
    if (opening) {
      map.jumpTo({
        center: [opening.longitude, opening.latitude],
        zoom: opening.zoom ?? map.getZoom(),
      });
    }
    return onReadyRef.current?.(map);
    // `layerKey` is the caller's statement that what it draws has changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerKey, status]);

  if (!canDraw || status === "error") return <>{fallback}</>;

  return (
    <div
      data-map-container={surface}
      data-map-status={status}
      role={role}
      aria-label={ariaLabel}
      /*
       * `isolate` contains MapLibre's own stacking. Its canvas and controls sit
       * well above every level in the app scale (header 40, modal 50, toast 60)
       * and the library leaves the container at `z-index: auto`, so without a
       * stacking context here those numbers resolve against the page root and
       * the map paints over the sticky header and the mobile tab bar.
       */
      className={`maplibre-container isolate ${className}`}
      ref={containerRef}
    />
  );
};

/** Read at map creation, which is when the only animated decision is made. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
