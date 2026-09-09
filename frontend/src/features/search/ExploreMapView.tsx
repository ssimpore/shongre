import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Maximize2, X, Navigation, Compass } from "lucide-react";
import { Listing } from "../../types";
import { plural } from "../../utilities/formatters";
import {
  getMarketMapConfiguration,
  resolvePublicMapCoordinates,
} from "../../configuration/geoCoordinates";
import { useTranslation } from "../../i18n/I18nProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { ListingCard } from "../../design-system/primitives/ListingCard";
import { presentExploreMapMarker } from "./explore-map-marker.presentation";
import { MapCanvas } from "../../design-system/primitives/MapCanvas";

interface ExploreMapViewProps {
  listings: Listing[];
  selectedCity?: string;
  onSelectCity?: (city: string) => void;
  fillHeight?: boolean;
  showResultsSidebar?: boolean;
}

export const ExploreMapView: React.FC<ExploreMapViewProps> = ({
  listings,
  selectedCity,
  onSelectCity,
  fillHeight = false,
  showResultsSidebar = true,
}) => {
  const { t } = useTranslation();
  const { activeMarket, currentLocale, convertMoney, popularCities } =
    useMarketLocation();
  const marketMap = getMarketMapConfiguration(activeMarket.code);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [listingId: string]: L.Marker }>({});

  const [activeListing, setActiveListing] = useState<Listing | null>(null);
  const [hoveredListingId, setHoveredListingId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const mapListings = useMemo(
    () =>
      listings.flatMap((listing) => {
        const coordinates = resolvePublicMapCoordinates(listing);
        return coordinates ? [{ listing, coordinates }] : [];
      }),
    [listings],
  );

  /*
   * The zoom control sits top-right here, clear of the filter bar the map is
   * inset into, so it is added rather than left in Leaflet's default corner.
   */
  const attachMap = (map: L.Map) => {
    mapInstanceRef.current = map;
    const zoom = L.control.zoom({ position: "topright" }).addTo(map);
    return () => {
      zoom.remove();
      mapInstanceRef.current = null;
    };
  };

  /* Toggling the listing panel changes the map container's width, and Leaflet
     only recomputes its tile grid when told to. Without this, hiding the panel
     widened the container from 520px to 904px while the tiles still covered the
     old 520 — leaving a ~220px grey band down the right-hand side until the next
     pan or zoom. `invalidateSize` runs after the layout has settled. */
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const id = requestAnimationFrame(() =>
      map.invalidateSize({ animate: false }),
    );
    return () => cancelAnimationFrame(id);
  }, [isSidebarOpen]);

  // Update Markers when listings change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing markers
    Object.values(markersRef.current).forEach((m) => {
      (m as L.Marker).remove();
    });
    markersRef.current = {};

    if (mapListings.length === 0) return;

    const bounds = L.latLngBounds([]);

    mapListings.forEach(({ listing, coordinates }) => {
      const latLng = L.latLng(coordinates.lat, coordinates.lng);
      bounds.extend(latLng);

      const isSelected = activeListing?.id === listing.id;
      const isHovered = hoveredListingId === listing.id;
      const markerPresentation = presentExploreMapMarker(
        listing,
        currentLocale,
        activeMarket.code,
        {
          free: t("ui.listingCard.free"),
          onRequest: t("ui.listingCard.onRequest"),
        },
        convertMoney,
      );
      const { isBoosted: hasActivePromotion, priceText } = markerPresentation;
      const priceNode = document.createElement("span");
      priceNode.textContent = priceText || "";

      // Custom HTML Marker Pill
      const customHtml = `
        <div class="shongre-map-marker-wrapper transition-all duration-normal transform ${
          isSelected
            ? "scale-115 z-dropdown"
            : isHovered
              ? "scale-110 z-sticky"
              : "z-raised"
        }">
          <div class="px-2.5 py-1 rounded-full font-bold text-xs shadow-md border flex items-center gap-1 cursor-pointer select-none transition-colors ${
            isSelected
              ? "bg-primary text-text-inverse border-primary-hover ring-3 ring-primary-border"
              : isHovered
                ? "bg-surface-inverse text-text-inverse border-border-inverse"
                : "bg-bg-surface text-text-main border-border-base hover:border-border-strong"
          }">
            ${hasActivePromotion ? '<span class="w-1.5 h-1.5 rounded-full bg-rating-fill"></span>' : ""}
            ${priceText ? priceNode.outerHTML : ""}
          </div>
          <div class="w-2 h-2 bg-current rotate-45 mx-auto -mt-1 ${
            isSelected
              ? "text-primary"
              : isHovered
                ? "text-text-main"
                : "text-text-inverse"
          }"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "shongre-custom-marker-icon",
        html: customHtml,
        iconSize: [60, 32],
        iconAnchor: [30, 24],
      });

      const marker = L.marker(latLng, { icon: customIcon }).addTo(map);

      marker.on("click", () => {
        setActiveListing(listing);
        map.panTo(latLng, { animate: true, duration: 0.5 });
      });

      marker.on("mouseover", () => {
        setHoveredListingId(listing.id);
      });

      marker.on("mouseout", () => {
        setHoveredListingId(null);
      });

      markersRef.current[listing.id] = marker;
    });

    // Adjust map to fit markers if listings are loaded
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    }
  }, [
    mapListings,
    activeListing?.id,
    hoveredListingId,
    currentLocale,
    activeMarket.code,
    convertMoney,
    t,
  ]);

  // Pan to selected city if updated from parent or shortcut
  const handleFlyToCity = (cityName: string) => {
    if (onSelectCity) onSelectCity(cityName);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (cityName === "all") {
      map.setView(
        [marketMap.center.lat, marketMap.center.lng],
        marketMap.center.zoom,
        { animate: true },
      );
      return;
    }

    const key = cityName.toLowerCase().trim();
    const cityData = marketMap.cities[key];
    if (cityData) {
      map.setView([cityData.lat, cityData.lng], cityData.zoom || 12, {
        animate: true,
      });
    }
  };

  const handleFitAll = () => {
    const map = mapInstanceRef.current;
    if (!map || mapListings.length === 0) return;
    const bounds = L.latLngBounds([]);
    mapListings.forEach(({ coordinates }) => {
      bounds.extend(L.latLng(coordinates.lat, coordinates.lng));
    });
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: true });
    }
  };

  return (
    <div
      data-search-results-map
      className={`relative w-full overflow-hidden rounded-2xl border border-border-base bg-bg-base shadow-xs ${
        fillHeight ? "flex h-full min-h-0 flex-col" : ""
      }`}
    >
      {/* Top Quick Filters Bar */}
      <div className="bg-bg-surface/95 backdrop-blur-sm border-b border-border-base px-4 py-2.5 flex items-center justify-between gap-3 z-sticky shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-xs font-bold text-text-tertiary flex items-center gap-1 shrink-0">
            <Compass className="w-icon-sm h-icon-sm text-primary" />
            Explorer :
          </span>

          <button
            type="button"
            onClick={() => handleFlyToCity("all")}
            className="px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-muted text-text-emphasis hover:bg-surface-disabled transition-colors shrink-0"
          >
            {activeMarket.name}
          </button>

          {popularCities.slice(0, 8).map(({ name: city }) => (
            <button
              key={city}
              type="button"
              onClick={() => handleFlyToCity(city)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors shrink-0 ${
                selectedCity === city
                  ? "bg-primary text-text-inverse shadow-xs"
                  : "bg-bg-base text-text-emphasis hover:bg-surface-disabled/80 border border-border-base"
              }`}
            >
              {city}
            </button>
          ))}
        </div>

        {/* View & Layer Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleFitAll}
            title={t("search.exploreMapView.recadrerSurLesAnnonces")}
            className="p-1.5 text-xs font-semibold text-text-supporting hover:text-text-main bg-surface-muted hover:bg-surface-disabled rounded-lg flex items-center gap-1 transition-colors"
          >
            <Maximize2 className="w-icon-sm h-icon-sm" />
            <span className="hidden md:inline">Recadrer</span>
          </button>

          {showResultsSidebar ? (
            <button
              type="button"
              onClick={() => setIsSidebarOpen((value) => !value)}
              className="hidden items-center gap-1 rounded-lg bg-surface-muted p-1.5 text-xs font-semibold text-text-supporting transition-colors hover:bg-surface-disabled hover:text-text-main lg:flex"
            >
              <span>
                {isSidebarOpen ? "Masquer la liste" : "Afficher la liste"}
              </span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Main Map Stage & Floating Sidepanel */}
      <div
        className={
          fillHeight
            ? "relative flex min-h-0 w-full flex-1 overflow-hidden"
            : "relative flex h-search-map min-h-0 w-full overflow-hidden sm:h-search-map-tall"
        }
      >
        {/* Collapsible left sidebar with matching listings.
            Placed before the map in the DOM as well as visually, so tab order
            follows what is on screen rather than jumping the map first. */}
        {showResultsSidebar && isSidebarOpen ? (
          <div className="hidden lg:flex flex-col w-80 xl:w-96 bg-bg-surface/95 backdrop-blur-md border-r border-border-base z-sticky shrink-0">
            <div className="p-3 border-b border-border-base flex items-center justify-between">
              <span className="text-xs font-bold text-text-strong truncate">
                {plural(mapListings.length, "annonce")} sur la carte
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {mapListings.map(({ listing: item }) => {
                const isSelected = activeListing?.id === item.id;

                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => setHoveredListingId(item.id)}
                    onMouseLeave={() => setHoveredListingId(null)}
                    className={`mx-auto w-listing-card max-w-full rounded-card ${
                      isSelected ? "ring-2 ring-primary-ring-strong" : ""
                    }`}
                  >
                    <ListingCard listing={item} />
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Keep the selected listing inside the actual map stage rather than
            growing the page below it. The wrapper also prevents the preview
            from covering the optional desktop results sidebar. */}
        <div className="relative min-w-0 flex-1" data-testid="search-map-stage">
          <MapCanvas
            surface="explore"
            center={{
              latitude: marketMap.center.lat,
              longitude: marketMap.center.lng,
              zoom: marketMap.center.zoom,
            }}
            layerKey={activeMarket.code}
            zoomControl={false}
            scrollWheelZoom
            ariaLabel={t("search.exploreMapView.regionLabel")}
            className="h-full w-full z-raised"
            onReady={attachMap}
          />

          {activeListing && (
            <div
              className="pointer-events-none absolute inset-x-3 bottom-3 z-sticky motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-normal sm:inset-x-4 sm:bottom-4"
              aria-live="polite"
              data-testid="map-active-listing"
            >
              <div className="pointer-events-auto mx-auto flex max-w-3xl items-start gap-2 rounded-card bg-bg-surface/95 p-2 shadow-lg backdrop-blur-sm">
                <div className="min-w-0 flex-1">
                  <ListingCard listing={activeListing} variant="list" />
                </div>
                <button
                  type="button"
                  onClick={() => setActiveListing(null)}
                  className="shrink-0 rounded-full p-1 text-text-tertiary transition-colors hover:bg-surface-muted hover:text-text-emphasis focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  aria-label={t(
                    "search.exploreMapView.fermerLaPrevisualisation",
                  )}
                >
                  <X className="w-icon-md h-icon-md" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating status count. Anchored right: the listing panel now occupies
          the left edge, and this badge belongs over the map. */}
      <div className="absolute top-14 right-4 z-sticky pointer-events-none">
        <div className="bg-surface-inverse/85 backdrop-blur-sm text-text-inverse px-3 py-1.5 rounded-full text-xs font-medium shadow-md flex items-center gap-1.5">
          <Navigation className="w-icon-sm h-icon-sm text-primary" />
          <span>
            {plural(
              mapListings.length,
              "annonce géolocalisée",
              "annonces géolocalisées",
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
