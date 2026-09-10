import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Map as MapLibreMap, Marker } from "maplibre-gl";
import { Crosshair, MapPin, X } from "lucide-react";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { getMarketMapConfiguration } from "../../configuration/geoCoordinates";
import { useTranslation } from "../../i18n/I18nProvider";
import { MapContainer } from "../../design-system/primitives/map/MapContainer";
import {
  createMarkerElement,
  fitToCoordinates,
} from "../../design-system/primitives/map/map-layers";

export interface SearchMapItem {
  id: string;
  title: string;
  href: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  eyebrow?: string;
  detail?: string;
}

interface SearchResultsMapProps {
  items: SearchMapItem[];
  layout?: "standalone" | "split";
}

/**
 * Shared, domain-neutral map for result types with public map coordinates.
 * Domain pages own the projection and decide which results are safe to map.
 */
export function SearchResultsMap({
  items,
  layout = "standalone",
}: SearchResultsMapProps) {
  const { t } = useTranslation();
  const { activeMarket } = useMarketLocation();
  const mapConfiguration = getMarketMapConfiguration(activeMarket.code);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  /* The marker effect reads the map from a ref, so it needs a state change to
     depend on; otherwise it runs once against a null map and never again. */
  const [isMapReady, setIsMapReady] = useState(false);
  const selectedItem = items.find((item) => item.id === selectedId);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    items.forEach((item, index) => {
      const selected = item.id === selectedItem?.id;
      const markerNumber = index + 1;
      /* The marker element is a real <button>: one control per marker, named
         for a screen reader, and answering both Enter and Space. */
      const marker = new Marker({
        element: createMarkerElement({
          label: t("ui.searchResultsMap.selectResult", {
            number: markerNumber,
          }),
          text: String(markerNumber),
          selected,
          onSelect: () => setSelectedId(item.id),
        }),
      })
        .setLngLat([item.longitude, item.latitude])
        .addTo(map);
      markersRef.current.push(marker);
      if (selected) map.panTo([item.longitude, item.latitude]);
    });

    if (!selectedItem && items.length) {
      fitToCoordinates(map, items, { padding: 48, maxZoom: 13 });
    }
  }, [isMapReady, items, selectedItem, t]);

  const fitResults = () => {
    const map = mapRef.current;
    if (!map || items.length === 0) return;
    fitToCoordinates(map, items, {
      padding: 48,
      maxZoom: 13,
      animate: true,
    });
  };

  return (
    <div
      data-search-results-map
      className={`overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs ${
        layout === "split" ? "flex h-full min-h-0 flex-col" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-base px-3 py-2.5 sm:px-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-bold text-text-main">
            <MapPin
              className="h-icon-sm w-icon-sm text-primary"
              aria-hidden="true"
            />
            {t(
              items.length === 1
                ? "ui.searchResultsMap.result"
                : "ui.searchResultsMap.results",
              { count: items.length },
            )}
          </p>
          <p className="mt-0.5 text-micro text-text-secondary">
            {t("ui.searchResultsMap.locationNote")}
          </p>
        </div>
        <button
          type="button"
          onClick={fitResults}
          className="flex min-h-control-sm cursor-pointer items-center gap-1.5 rounded-control border border-border-base bg-bg-surface px-2.5 text-xs font-semibold text-text-secondary hover:border-border-strong hover:text-text-main"
        >
          <Crosshair className="h-icon-sm w-icon-sm" aria-hidden="true" />
          {t("ui.searchResultsMap.fitResults")}
        </button>
      </div>

      <div
        className={
          layout === "split"
            ? "relative min-h-0 flex-1"
            : "relative h-search-map min-h-112 sm:h-search-map-tall"
        }
      >
        <MapContainer
          surface="search-results"
          center={{
            latitude: mapConfiguration.center.lat,
            longitude: mapConfiguration.center.lng,
            zoom: mapConfiguration.center.zoom,
          }}
          layerKey={activeMarket.code}
          ariaLabel={t("ui.searchResultsMap.regionLabel")}
          className="h-full w-full bg-bg-subtle"
          onReady={(map) => {
            mapRef.current = map;
            setIsMapReady(true);
            return () => {
              mapRef.current = null;
              setIsMapReady(false);
            };
          }}
        />

        {selectedItem ? (
          <div
            className="pointer-events-none absolute inset-x-3 bottom-3 z-sticky sm:inset-x-auto sm:right-4 sm:w-88"
            aria-live="polite"
          >
            <div className="pointer-events-auto flex items-start gap-2 rounded-card border border-border-base bg-bg-surface/95 p-3 shadow-lg backdrop-blur-sm">
              <Link
                to={selectedItem.href}
                className="min-w-0 flex-1 rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {selectedItem.eyebrow ? (
                  <p className="truncate text-micro font-semibold text-primary">
                    {selectedItem.eyebrow}
                  </p>
                ) : null}
                <p className="mt-0.5 line-clamp-2 text-sm font-bold text-text-main">
                  {selectedItem.title}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-text-secondary">
                  <MapPin
                    className="h-icon-xs w-icon-xs shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate">{selectedItem.locationLabel}</span>
                </p>
                {selectedItem.detail ? (
                  <p className="mt-1 truncate text-xs font-semibold text-text-main">
                    {selectedItem.detail}
                  </p>
                ) : null}
                <span className="mt-2 block text-xs font-semibold text-primary">
                  {t("ui.searchResultsMap.viewResult")}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setSelectedId(undefined)}
                className="cursor-pointer rounded-full p-1 text-text-tertiary hover:bg-surface-muted hover:text-text-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                aria-label={t("ui.searchResultsMap.closePreview")}
              >
                <X className="h-icon-md w-icon-md" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
