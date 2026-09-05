import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import { VerificationBadge } from "@shongre/ui/web";
import "leaflet/dist/leaflet.css";
import { routes } from "../../configuration/routes";
import {
  MapPin,
  Layers,
  Maximize2,
  X,
  ExternalLink,
  Navigation,
  Compass,
} from "lucide-react";
import { Listing } from "../../types";
import { plural } from "../../utilities/formatters";
import {
  getListingCoordinates,
  getMarketMapConfiguration,
} from "../../configuration/geoCoordinates";
import { Image } from "../../design-system/primitives/Image";
import { showsVerifiedBadge } from "../../domains/user/user.domain";
import { useTranslation } from "../../i18n/I18nProvider";
import { getListingCategoryLabel } from "../../domains/taxonomy/taxonomy.display";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";

interface ExploreMapViewProps {
  listings: Listing[];
  selectedCity?: string;
  onSelectCity?: (city: string) => void;
}

export const ExploreMapView: React.FC<ExploreMapViewProps> = ({
  listings,
  selectedCity,
  onSelectCity,
}) => {
  const { t } = useTranslation();
  const { activeMarket, formatPrice, popularCities } = useMarketLocation();
  const marketMap = getMarketMapConfiguration(activeMarket.code);
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [listingId: string]: L.Marker }>({});
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [activeListing, setActiveListing] = useState<Listing | null>(null);
  const [hoveredListingId, setHoveredListingId] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<"positron" | "osm">("positron");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up if already exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(
      [marketMap.center.lat, marketMap.center.lng],
      marketMap.center.zoom,
    );

    // Default tile layer - CartoDB Positron for a warm, clean aesthetic matching Shongre
    const positronLayer = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19,
        subdomains: "abcd",
      },
    ).addTo(map);

    tileLayerRef.current = positronLayer;
    mapInstanceRef.current = map;

    // Add zoom control top right
    L.control.zoom({ position: "topright" }).addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [activeMarket.code, marketMap.center]);

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

  // Switch Map Style
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    const newUrl =
      mapStyle === "positron"
        ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    const newLayer = L.tileLayer(newUrl, {
      maxZoom: 19,
      subdomains: mapStyle === "positron" ? "abcd" : "abc",
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newLayer;
  }, [mapStyle]);

  // Update Markers when listings change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing markers
    Object.values(markersRef.current).forEach((m) => {
      (m as L.Marker).remove();
    });
    markersRef.current = {};

    if (listings.length === 0) return;

    const bounds = L.latLngBounds([]);

    listings.forEach((listing) => {
      const coords = getListingCoordinates(listing);
      const latLng = L.latLng(coords.lat, coords.lng);
      bounds.extend(latLng);

      const isSelected = activeListing?.id === listing.id;
      const isHovered = hoveredListingId === listing.id;
      const priceText = formatPrice(listing.price, {
        isFreeDonation: listing.isFreeDonation,
      });

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
            ${listing.isBoosted ? '<span class="w-1.5 h-1.5 rounded-full bg-rating-fill"></span>' : ""}
            <span>${priceText}</span>
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
  }, [listings, activeListing?.id, hoveredListingId, formatPrice]);

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
    if (!map || listings.length === 0) return;
    const bounds = L.latLngBounds([]);
    listings.forEach((l) => {
      const coords = getListingCoordinates(l);
      bounds.extend(L.latLng(coords.lat, coords.lng));
    });
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: true });
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border-base bg-bg-base shadow-xs">
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

          <button
            type="button"
            onClick={() =>
              setMapStyle((s) => (s === "positron" ? "osm" : "positron"))
            }
            title={t("search.exploreMapView.changerLeStyleDeCarte")}
            className="p-1.5 text-xs font-semibold text-text-supporting hover:text-text-main bg-surface-muted hover:bg-surface-disabled rounded-lg flex items-center gap-1 transition-colors"
          >
            <Layers className="w-icon-sm h-icon-sm" />
            <span className="hidden md:inline">
              {mapStyle === "positron" ? "Plan doux" : "OSM"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsSidebarOpen((v) => !v)}
            className="p-1.5 text-xs font-semibold text-text-supporting hover:text-text-main bg-surface-muted hover:bg-surface-disabled rounded-lg hidden lg:flex items-center gap-1 transition-colors"
          >
            <span>
              {isSidebarOpen ? "Masquer la liste" : "Afficher la liste"}
            </span>
          </button>
        </div>
      </div>

      {/* Main Map Stage & Floating Sidepanel */}
      <div className="relative flex h-search-map min-h-0 w-full overflow-hidden sm:h-search-map-tall">
        {/* Collapsible left sidebar with matching listings.
            Placed before the map in the DOM as well as visually, so tab order
            follows what is on screen rather than jumping the map first. */}
        {isSidebarOpen && (
          <div className="hidden lg:flex flex-col w-80 xl:w-96 bg-bg-surface/95 backdrop-blur-md border-r border-border-base z-sticky shrink-0">
            <div className="p-3 border-b border-border-base flex items-center justify-between">
              <span className="text-xs font-bold text-text-strong truncate">
                {plural(listings.length, "annonce")} sur la carte
              </span>
              <span className="text-xs text-text-tertiary">
                {t("search.exploreMapView.cliquezPourCentrer")}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-border-subtle">
              {listings.map((item) => {
                const isSelected = activeListing?.id === item.id;
                const isHovered = hoveredListingId === item.id;

                return (
                  <button
                    type="button"
                    key={item.id}
                    onMouseEnter={() => setHoveredListingId(item.id)}
                    onMouseLeave={() => setHoveredListingId(null)}
                    onClick={() => {
                      setActiveListing(item);
                      const coords = getListingCoordinates(item);
                      mapInstanceRef.current?.setView(
                        [coords.lat, coords.lng],
                        13,
                        {
                          animate: true,
                        },
                      );
                    }}
                    aria-pressed={isSelected}
                    className={`w-full pt-2.5 first:pt-0 cursor-pointer rounded-xl p-2 text-left transition-colors ${
                      isSelected
                        ? "bg-primary-light border border-primary-border"
                        : isHovered
                          ? "bg-surface-soft"
                          : "hover:bg-surface-soft"
                    }`}
                  >
                    <div className="flex gap-2.5 items-center">
                      <Image
                        src={item.coverImageUrl || item.photos[0]?.url}
                        alt=""
                        sizes="56px"
                        className="w-14 h-14 rounded-lg object-cover border border-border-base shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-text-main truncate">
                            {item.title}
                          </span>
                        </div>
                        <div className="text-xs text-text-tertiary truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-icon-xs h-icon-xs text-text-inverse-subtle" />
                          {item.city} ({item.postalCode})
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs font-bold text-primary">
                            {formatPrice(item.price)}
                          </span>
                          <span className="text-micro text-text-tertiary font-medium">
                            {item.sellerName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Keep the selected listing inside the actual map stage rather than
            growing the page below it. The wrapper also prevents the preview
            from covering the optional desktop results sidebar. */}
        <div className="relative min-w-0 flex-1" data-testid="search-map-stage">
          <div ref={mapContainerRef} className="h-full w-full z-raised" />

          {activeListing && (
            <div
              className="pointer-events-none absolute inset-x-3 bottom-3 z-sticky motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-normal sm:inset-x-4 sm:bottom-4"
              aria-live="polite"
              data-testid="map-active-listing"
            >
              <div className="pointer-events-auto mx-auto flex max-w-3xl items-start gap-3 rounded-card border border-border-base bg-bg-surface/95 p-3 shadow-lg backdrop-blur-sm sm:gap-4 sm:p-4">
                <button
                  type="button"
                  onClick={() => setActiveListing(null)}
                  className="order-3 shrink-0 rounded-full p-1 text-text-tertiary transition-colors hover:bg-surface-muted hover:text-text-emphasis focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  aria-label={t(
                    "search.exploreMapView.fermerLaPrevisualisation",
                  )}
                >
                  <X className="w-icon-md h-icon-md" />
                </button>

                <div className="flex min-w-0 flex-1 gap-3">
                  <Image
                    src={
                      activeListing.coverImageUrl ||
                      activeListing.photos[0]?.url
                    }
                    alt={activeListing.title}
                    sizes="(min-width: 640px) 96px, 80px"
                    className="h-20 w-20 shrink-0 rounded-control border border-border-base object-cover sm:h-24 sm:w-24"
                    referrerPolicy="no-referrer"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-xs font-semibold text-text-tertiary">
                        {getListingCategoryLabel(activeListing)}
                      </span>
                      {showsVerifiedBadge(activeListing) && (
                        <VerificationBadge
                          label={t("ui.identityStatus.verification.generic")}
                          accessibilityLabel={t(
                            "ui.identityStatus.verification.profile",
                          )}
                        />
                      )}
                    </div>

                    <h4 className="line-clamp-1 text-sm font-bold leading-snug text-text-main">
                      {activeListing.title}
                    </h4>

                    <div className="mt-1 flex items-center gap-2 text-xs text-text-tertiary">
                      <span className="flex min-w-0 items-center gap-0.5 font-medium text-text-emphasis">
                        <MapPin className="h-icon-xs w-icon-xs shrink-0 text-primary" />
                        <span className="truncate">
                          {activeListing.city} ({activeListing.postalCode})
                        </span>
                      </span>
                    </div>

                    <div className="mt-2 flex items-baseline justify-between gap-2 border-t border-border-subtle pt-1">
                      <span className="shrink-0 text-base font-bold text-primary">
                        {formatPrice(activeListing.price)}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(routes.listing.detail(activeListing.id))
                        }
                        className="flex min-w-0 items-center gap-1 truncate text-xs font-semibold text-primary hover:underline cursor-pointer"
                      >
                        <span className="truncate">
                          {t("search.exploreMapView.voirLAnnonce")}
                        </span>
                        <ExternalLink className="h-icon-xs w-icon-xs shrink-0" />
                      </button>
                    </div>
                  </div>
                </div>
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
              listings.length,
              "annonce géolocalisée",
              "annonces géolocalisées",
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
