import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, MapPin, X } from "lucide-react";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { getMarketMapConfiguration } from "../../configuration/geoCoordinates";
import { useTranslation } from "../../i18n/I18nProvider";
import { MAP_TILE_OPTIONS, MAP_TILE_URL } from "../../platform/map/tile-source";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const selectedItem = items.find((item) => item.id === selectedId);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    }).setView(
      [mapConfiguration.center.lat, mapConfiguration.center.lng],
      mapConfiguration.center.zoom,
    );
    L.tileLayer(MAP_TILE_URL, MAP_TILE_OPTIONS).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapConfiguration.center]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    const bounds = L.latLngBounds([]);

    items.forEach((item, index) => {
      const selected = item.id === selectedItem?.id;
      const markerNumber = index + 1;
      const icon = L.divIcon({
        className: "shongre-search-result-marker",
        html: `<button type="button" aria-label="${t("ui.searchResultsMap.selectResult", { number: markerNumber })}" class="grid h-9 w-9 place-items-center rounded-full border-2 border-border-on-inverse bg-primary font-sans text-xs font-bold text-text-inverse shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected ? "scale-110 ring-4 ring-primary-border" : ""}">${markerNumber}</button>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      const latLng = L.latLng(item.latitude, item.longitude);
      const marker = L.marker(latLng, { icon, keyboard: false }).addTo(map);
      marker.on("click", () => setSelectedId(item.id));
      markersRef.current.push(marker);
      bounds.extend(latLng);
      if (selected) map.panTo(latLng, { animate: true });
    });

    if (!selectedItem && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
    }
  }, [items, selectedItem, t]);

  const fitResults = () => {
    const map = mapRef.current;
    if (!map || items.length === 0) return;
    const bounds = L.latLngBounds(
      items.map((item) => [item.latitude, item.longitude]),
    );
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13, animate: true });
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
        <div
          ref={containerRef}
          className="leaflet-container h-full w-full bg-bg-subtle"
          role="region"
          aria-label={t("ui.searchResultsMap.regionLabel")}
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
