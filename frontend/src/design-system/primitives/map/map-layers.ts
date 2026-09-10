import { LngLatBounds, Map as MapLibreMap, Marker } from "maplibre-gl";
import { themeColors } from "@shongre/design-tokens";
import type { GeoCoordinate } from "@shongre/contracts/geospatial";

/**
 * The drawing vocabulary every Shongre map shares.
 *
 * MapLibre draws from a style, so anything a surface adds has to be expressed
 * as a source and a layer rather than as a widget. Putting the four things the
 * product actually draws here — an approximate area, a marker, a fit, and the
 * colours they use — keeps five surfaces from each inventing their own, which
 * is how the previous renderer ended up with two of them drawing unattributed
 * tiles and three different marker sizes.
 */

/**
 * A design token, resolved to the concrete colour MapLibre needs.
 *
 * MapLibre paints into a canvas, so it cannot read a CSS custom property the
 * way a DOM node can: it needs a value. Reading the token at draw time keeps
 * the map on the same palette as the rest of the product instead of freezing a
 * hex into the code, which is the failure this project's token guard exists to
 * catch everywhere else.
 */
export function readMapToken(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

const EARTH_RADIUS_METERS = 6_378_137;

/**
 * A disc on the ground, as a polygon.
 *
 * MapLibre's `circle` layer measures its radius in screen pixels, so a disc
 * drawn that way keeps its size as the reader zooms and stops describing an
 * area at all. A polygon in real coordinates stays the area it claims to be,
 * which matters because this disc is the product's statement about how
 * precisely a listing's location is known.
 */
export function metricCirclePolygon(
  center: GeoCoordinate,
  radiusMeters: number,
  steps = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const latitudeRadians = (center.latitude * Math.PI) / 180;
  const latitudeDelta = (radiusMeters / EARTH_RADIUS_METERS) * (180 / Math.PI);
  const longitudeDelta =
    latitudeDelta / Math.max(0.01, Math.cos(latitudeRadians));
  const ring: GeoJSON.Position[] = [];
  for (let vertex = 0; vertex <= steps; vertex += 1) {
    const angle = (vertex / steps) * 2 * Math.PI;
    ring.push([
      center.longitude + longitudeDelta * Math.cos(angle),
      center.latitude + latitudeDelta * Math.sin(angle),
    ]);
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [ring] },
  };
}

/**
 * The area a listing is within, drawn as a disc and never as a pin.
 *
 * A single marker over an approximate coordinate presents it as an address the
 * seller never agreed to share. The disc is the honest rendering of what the
 * published data means, and it is what stops a reader inferring a doorstep from
 * a rounded coordinate.
 */
export function addApproximateArea(
  map: MapLibreMap,
  center: GeoCoordinate,
  radiusMeters: number,
): () => void {
  const sourceId = "shongre-approximate-area";
  const fillId = `${sourceId}-fill`;
  const lineId = `${sourceId}-line`;
  /* The custom property is the live value the page is painted with; the typed
     export is the same token compiled, and is what answers before the document
     exists — during a server render, or in a test with no stylesheet. */
  const primary = readMapToken("--color-primary", themeColors.primary);

  map.addSource(sourceId, {
    type: "geojson",
    data: metricCirclePolygon(center, radiusMeters),
  });
  map.addLayer({
    id: fillId,
    type: "fill",
    source: sourceId,
    paint: { "fill-color": primary, "fill-opacity": 0.18 },
  });
  map.addLayer({
    id: lineId,
    type: "line",
    source: sourceId,
    paint: { "line-color": primary, "line-width": 2, "line-opacity": 0.55 },
  });

  return () => {
    for (const id of [lineId, fillId]) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  };
}

export interface MapMarkerOptions {
  /** Selected markers are larger and re-coloured, and also gain a label. */
  selected?: boolean;
  /** Announced by assistive technology; a marker with no name is unusable. */
  label: string;
  /** Shown inside the marker — a price, a count. Kept to a few characters. */
  text?: string;
  onSelect?: () => void;
}

/**
 * A branded marker.
 *
 * Built from a DOM element rather than an image so it inherits the product's
 * tokens, can carry a label, and is reachable by keyboard — MapLibre markers
 * are plain elements, so making one a `<button>` is all it takes for a screen
 * reader and a Tab key to find it. Selection is signalled by size and a border
 * as well as colour, because colour alone is not a status signal.
 */
export function createMarkerElement(options: MapMarkerOptions): HTMLElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = options.selected
    ? "shongre-map-marker shongre-map-marker--selected"
    : "shongre-map-marker";
  button.setAttribute("aria-label", options.label);
  if (options.selected) button.setAttribute("aria-current", "true");
  if (options.text) button.textContent = options.text;
  if (options.onSelect) {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      options.onSelect?.();
    });
  }
  return button;
}

export function addMarker(
  map: MapLibreMap,
  coordinate: GeoCoordinate,
  options: MapMarkerOptions,
): Marker {
  return new Marker({ element: createMarkerElement(options) })
    .setLngLat([coordinate.longitude, coordinate.latitude])
    .addTo(map);
}

/**
 * Frames every point the reader is meant to see.
 *
 * A single point has no extent, so fitting to it would zoom to the maximum and
 * show one building; it is centred at a neighbourhood zoom instead. Padding is
 * uniform because the surrounding chrome differs per surface and a caller that
 * needs asymmetry can pass its own.
 */
export function fitToCoordinates(
  map: MapLibreMap,
  coordinates: readonly GeoCoordinate[],
  options: { padding?: number; maxZoom?: number; animate?: boolean } = {},
): void {
  const usable = coordinates.filter(
    (point) =>
      Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
  );
  if (!usable.length) return;
  if (usable.length === 1) {
    map.jumpTo({
      center: [usable[0]!.longitude, usable[0]!.latitude],
      zoom: options.maxZoom ?? 13,
    });
    return;
  }
  const bounds = usable.reduce(
    (accumulator, point) =>
      accumulator.extend([point.longitude, point.latitude]),
    new LngLatBounds(
      [usable[0]!.longitude, usable[0]!.latitude],
      [usable[0]!.longitude, usable[0]!.latitude],
    ),
  );
  map.fitBounds(bounds, {
    padding: options.padding ?? 48,
    maxZoom: options.maxZoom ?? 15,
    animate: options.animate ?? false,
  });
}
