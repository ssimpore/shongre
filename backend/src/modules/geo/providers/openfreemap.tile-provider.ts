import type { GeoMapConfig } from "../geo.config.js";
import type { MapTileProvider } from "../geo.contracts.js";

/**
 * OpenFreeMap, as a style URL and the credit that must travel with it.
 *
 * The adapter is this small because a vector basemap really is just a style
 * document: MapLibre fetches the style, and the style names its own sources and
 * glyphs. What the adapter is *for* is the seam — the day OpenFreeMap changes
 * its terms or its availability, a replacement is a second class in this
 * directory and one environment value, not a search through five components
 * for a hard-coded URL, which is what the product had before.
 *
 * Attribution is returned by the provider rather than configured next to it
 * because for every provider worth using it is a licence condition attached to
 * the data, not a design choice attached to the page.
 */
export class OpenFreeMapTileProvider implements MapTileProvider {
  readonly id = "openfreemap";

  constructor(private readonly config: GeoMapConfig) {}

  styleUrl(): string {
    return this.config.styleUrl;
  }

  attribution(): string {
    return this.config.attribution;
  }
}
