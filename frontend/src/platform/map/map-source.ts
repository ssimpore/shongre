import type { PublicMapConfig } from "@shongre/contracts/geospatial";
import type { MarketContext } from "@shongre/contracts/market-country";
import { services } from "../../api/client/service-registry";
import { getPublicRuntimeConfig } from "../runtime-config/public-runtime-config";

/**
 * The basemap every Shongre map draws on.
 *
 * This replaced a raster tile URL that had been copied into five components,
 * all pointing at a public endpoint nobody had a right to use at product scale:
 * CARTO answered with an "API KEY REQUIRED" watermark, and OpenStreetMap's own
 * tile servers run on donated capacity whose usage policy forbids exactly that
 * — a distributed application sending every visitor's browser at them.
 *
 * The replacement is a MapLibre *style document*, not a tile template. A style
 * names its own sources, glyphs and sprites, which is why swapping providers is
 * one URL rather than a rewrite of every layer. OpenFreeMap serves one from a
 * CDN without a key, so unlike the raster endpoint it replaced there is a
 * default a hosted environment may actually use.
 *
 * Attribution travels with the style because for every provider worth using it
 * is a condition of the licence, not a design choice.
 */
export function getMapConfig(): PublicMapConfig {
  const { map } = getPublicRuntimeConfig();
  return {
    provider: map.provider,
    styleUrl: map.styleUrl,
    attribution: map.attribution,
    defaultCenter: map.defaultCenter,
    defaultZoom: map.defaultZoom,
    minZoom: map.minZoom,
    maxZoom: map.maxZoom,
    maxSearchRadiusKm: map.maxSearchRadiusKm,
  };
}

/**
 * The same configuration, over HTTP.
 *
 * The Web client does not need this — its runtime config is injected into the
 * document, so the map draws before any request resolves. It exists because the
 * values are owned by the backend's geospatial module, and a client without
 * that injection has to be able to ask rather than carry a second copy of the
 * provider's identity.
 */
export async function fetchMapConfig(
  marketContext: MarketContext,
): Promise<PublicMapConfig> {
  return services.geo.getMapConfig(marketContext);
}

/**
 * True when this build has a basemap it may actually draw.
 *
 * A map with no configured style renders as a grey box with controls on it,
 * which reads as a broken feature rather than an absent one. Callers show
 * their non-map fallback instead.
 */
export function hasMapStyle(): boolean {
  return Boolean(getMapConfig().styleUrl);
}
