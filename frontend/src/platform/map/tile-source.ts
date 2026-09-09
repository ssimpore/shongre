/**
 * The raster basemap every Shongre map draws on.
 *
 * This was copied into three components, all pointing at CARTO's public
 * endpoint — which now answers with an "API KEY REQUIRED" watermark instead of
 * tiles, so every map in the product was rendering that text under its markers.
 * One definition means the next provider change is one edit, and it means a
 * broken basemap cannot be broken in only two of the three places.
 *
 * OpenStreetMap needs no key and its attribution is a condition of use, so the
 * two travel together and the layer is never added without it.
 */
export const MAP_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export const MAP_TILE_MAX_ZOOM = 19;

export const MAP_TILE_OPTIONS = {
  attribution: MAP_TILE_ATTRIBUTION,
  maxZoom: MAP_TILE_MAX_ZOOM,
} as const;
