import { getPublicRuntimeConfig } from "../runtime-config/public-runtime-config";

/**
 * The raster basemap every Shongre map draws on.
 *
 * This was copied into five components, all pointing at a public tile endpoint
 * nobody had a right to use at product scale. CARTO's answered with an "API KEY
 * REQUIRED" watermark instead of tiles; OpenStreetMap's runs on donated
 * capacity and its usage policy forbids exactly this — a distributed
 * application sending every visitor's browser at it. The failure mode is the
 * same either way and it arrives all at once: every map in the product goes
 * blank on the day the provider decides to enforce.
 *
 * So the endpoint is configuration, not a constant. Local and test builds fall
 * back to OpenStreetMap because that is what it is for; a hosted environment
 * must name a provider it is entitled to use, and `scripts/env-check.sh`
 * refuses to start without one.
 *
 * Attribution travels with the URL because for every provider worth using it is
 * a condition of the licence, not a design choice.
 */

export interface MapTileSource {
  url: string;
  attribution: string;
  maxZoom: number;
}

export function getMapTileSource(): MapTileSource {
  const { map } = getPublicRuntimeConfig();
  return {
    url: map.tileUrl,
    attribution: map.attribution,
    maxZoom: map.maxZoom,
  };
}

/** Leaflet's `tileLayer` options, derived from the configured provider. */
export function getMapTileOptions(): {
  attribution: string;
  maxZoom: number;
} {
  const source = getMapTileSource();
  return { attribution: source.attribution, maxZoom: source.maxZoom };
}

/**
 * True when this build has a basemap it may actually draw.
 *
 * A map with no configured provider renders as a grey box with controls on it,
 * which reads as a broken feature. Callers show nothing instead.
 */
export function hasMapTileSource(): boolean {
  return Boolean(getMapTileSource().url);
}
