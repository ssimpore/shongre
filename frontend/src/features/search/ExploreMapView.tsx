import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { routes } from '../../configuration/routes';
import {
  MapPin,
  Layers,
  Maximize2,
  X,
  ExternalLink,
  ShieldCheck,
  Star,
  Navigation,
  Compass,
} from 'lucide-react';
import { Listing } from '../../types';
import { formatPrice, plural } from '../../utilities/formatters';
import { getListingCoordinates, FRENCH_MAJOR_CITIES, FRANCE_CENTER } from '../../configuration/geoCoordinates';
import { Badge } from '../../design-system/primitives/Badge';
import { Button } from '../../design-system/primitives/Button';
import { Image } from '../../design-system/primitives/Image';
import { showsVerifiedBadge } from '../../domains/user/user.domain';

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
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [listingId: string]: L.Marker }>({});
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [activeListing, setActiveListing] = useState<Listing | null>(null);
  const [hoveredListingId, setHoveredListingId] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<'positron' | 'osm'>('positron');
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
    }).setView([FRANCE_CENTER.lat, FRANCE_CENTER.lng], 6);

    // Default tile layer - CartoDB Positron for a warm, clean aesthetic matching Shongre
    const positronLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 19,
        subdomains: 'abcd',
      }
    ).addTo(map);

    tileLayerRef.current = positronLayer;
    mapInstanceRef.current = map;

    // Add zoom control top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  /* Toggling the listing panel changes the map container's width, and Leaflet
     only recomputes its tile grid when told to. Without this, hiding the panel
     widened the container from 520px to 904px while the tiles still covered the
     old 520 — leaving a ~220px grey band down the right-hand side until the next
     pan or zoom. `invalidateSize` runs after the layout has settled. */
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const id = requestAnimationFrame(() => map.invalidateSize({ animate: false }));
    return () => cancelAnimationFrame(id);
  }, [isSidebarOpen]);

  // Switch Map Style
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    const newUrl =
      mapStyle === 'positron'
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const newLayer = L.tileLayer(newUrl, {
      maxZoom: 19,
      subdomains: mapStyle === 'positron' ? 'abcd' : 'abc',
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
      const priceText = listing.isFreeDonation ? 'Don' : `${listing.price} €`;

      // Custom HTML Marker Pill
      const customHtml = `
        <div class="shongre-map-marker-wrapper transition-all duration-normal transform ${
          isSelected ? 'scale-115 z-50' : isHovered ? 'scale-110 z-40' : 'z-10'
        }">
          <div class="px-2.5 py-1 rounded-full font-bold text-xs shadow-md border flex items-center gap-1 cursor-pointer select-none transition-colors ${
            isSelected
              ? 'bg-primary text-white border-primary-hover ring-3 ring-primary-border'
              : isHovered
              ? 'bg-stone-900 text-white border-stone-800'
              : 'bg-white text-stone-900 border-border-base hover:border-stone-400'
          }">
            ${listing.isBoosted ? '<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>' : ''}
            <span>${priceText}</span>
          </div>
          <div class="w-2 h-2 bg-current rotate-45 mx-auto -mt-1 ${
            isSelected ? 'text-primary' : isHovered ? 'text-stone-900' : 'text-white'
          }"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'shongre-custom-marker-icon',
        html: customHtml,
        iconSize: [60, 32],
        iconAnchor: [30, 24],
      });

      const marker = L.marker(latLng, { icon: customIcon }).addTo(map);

      marker.on('click', () => {
        setActiveListing(listing);
        map.panTo(latLng, { animate: true, duration: 0.5 });
      });

      marker.on('mouseover', () => {
        setHoveredListingId(listing.id);
      });

      marker.on('mouseout', () => {
        setHoveredListingId(null);
      });

      markersRef.current[listing.id] = marker;
    });

    // Adjust map to fit markers if listings are loaded
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    }
  }, [listings, activeListing?.id, hoveredListingId]);

  // Pan to selected city if updated from parent or shortcut
  const handleFlyToCity = (cityName: string) => {
    if (onSelectCity) onSelectCity(cityName);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (cityName === 'Toute la France') {
      map.setView([FRANCE_CENTER.lat, FRANCE_CENTER.lng], 6, { animate: true });
      return;
    }

    const key = cityName.toLowerCase().trim();
    const cityData = FRENCH_MAJOR_CITIES[key];
    if (cityData) {
      map.setView([cityData.lat, cityData.lng], cityData.zoom || 12, { animate: true });
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
    <div className="relative w-full h-[680px] sm:h-[720px] rounded-2xl overflow-hidden border border-border-base bg-bg-base shadow-xs flex flex-col">
      {/* Top Quick Filters Bar */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-border-base px-4 py-2.5 flex items-center justify-between gap-3 z-20 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-xs font-bold text-stone-500 flex items-center gap-1 shrink-0">
            <Compass className="w-3.5 h-3.5 text-primary" />
            Explorer :
          </span>

          <button
            type="button"
            onClick={() => handleFlyToCity('Toute la France')}
            className="px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors shrink-0"
          >
            Toute la France
          </button>

          {['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Toulouse', 'Nantes', 'Lille', 'Nice'].map(
            (city) => (
              <button
                key={city}
                type="button"
                onClick={() => handleFlyToCity(city)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors shrink-0 ${
                  selectedCity === city
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-bg-base text-stone-700 hover:bg-stone-200/80 border border-border-base'
                }`}
              >
                {city}
              </button>
            )
          )}
        </div>

        {/* View & Layer Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleFitAll}
            title="Recadrer sur les annonces"
            className="p-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center gap-1 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Recadrer</span>
          </button>

          <button
            type="button"
            onClick={() => setMapStyle((s) => (s === 'positron' ? 'osm' : 'positron'))}
            title="Changer le style de carte"
            className="p-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center gap-1 transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {mapStyle === 'positron' ? 'Plan doux' : 'OSM'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsSidebarOpen((v) => !v)}
            className="p-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg hidden lg:flex items-center gap-1 transition-colors"
          >
            <span>{isSidebarOpen ? 'Masquer la liste' : 'Afficher la liste'}</span>
          </button>
        </div>
      </div>

      {/* Main Map Stage & Floating Sidepanel */}
      <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden flex">
        {/* Collapsible left sidebar with matching listings.
            Placed before the map in the DOM as well as visually, so tab order
            follows what is on screen rather than jumping the map first. */}
        {isSidebarOpen && (
          <div className="hidden lg:flex flex-col w-80 xl:w-96 bg-white/95 backdrop-blur-md border-r border-border-base z-20 shrink-0">
            <div className="p-3 border-b border-border-base flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 truncate">
                {plural(listings.length, 'annonce')} sur la carte
              </span>
              <span className="text-xs text-stone-500">Cliquez pour centrer</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-border-subtle">
              {listings.map((item) => {
                const isSelected = activeListing?.id === item.id;
                const isHovered = hoveredListingId === item.id;

                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => setHoveredListingId(item.id)}
                    onMouseLeave={() => setHoveredListingId(null)}
                    onClick={() => {
                      setActiveListing(item);
                      const coords = getListingCoordinates(item);
                      mapInstanceRef.current?.setView([coords.lat, coords.lng], 13, {
                        animate: true,
                      });
                    }}
                    className={`pt-2.5 first:pt-0 cursor-pointer rounded-xl p-2 transition-colors ${
                      isSelected
                        ? 'bg-primary-light border border-primary-border'
                        : isHovered
                        ? 'bg-stone-50'
                        : 'hover:bg-stone-50'
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
                          <span className="text-xs font-bold text-stone-900 truncate">
                            {item.title}
                          </span>
                        </div>
                        <div className="text-xs text-stone-500 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-stone-400" />
                          {item.city} ({item.postalCode})
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs font-black text-primary">
                            {formatPrice(item.price)}
                          </span>
                          <span className="text-micro text-stone-500 font-medium">
                            {item.sellerName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Leaflet Container */}
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Floating Active Listing Preview Card */}
        {activeListing && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:w-96 z-30 bg-white rounded-2xl shadow-xl border border-border-base p-3.5 animate-in fade-in slide-in-from-bottom-3 duration-normal">
            <button
              type="button"
              onClick={() => setActiveListing(null)}
              className="absolute top-2.5 right-2.5 p-1 rounded-full text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              aria-label="Fermer la prévisualisation"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex gap-3">
              <Image
                src={activeListing.coverImageUrl || activeListing.photos[0]?.url}
                alt={activeListing.title}
                sizes="96px"
                className="w-24 h-24 rounded-xl object-cover border border-border-base shrink-0"
                referrerPolicy="no-referrer"
              />

              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-semibold text-stone-500 truncate">
                    {activeListing.categoryLabel}
                  </span>
                  {showsVerifiedBadge(activeListing) && (
                    <Badge variant="verified" size="sm" icon>
                      Vérifié
                    </Badge>
                  )}
                </div>

                <h4 className="text-sm font-bold text-stone-900 line-clamp-1 leading-snug">
                  {activeListing.title}
                </h4>

                <div className="flex items-center gap-2 mt-1 text-xs text-stone-500">
                  <span className="flex items-center gap-0.5 font-medium text-stone-700">
                    <MapPin className="w-3 h-3 text-primary" />
                    {activeListing.city} ({activeListing.postalCode})
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-2 pt-1 border-t border-border-subtle">
                  <span className="text-base font-black text-primary">
                    {formatPrice(activeListing.price)}
                  </span>

                  <button
                    type="button"
                    onClick={() => navigate(routes.listing.detail(activeListing.id))}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Voir l'annonce
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating status count. Anchored right: the listing panel now occupies
          the left edge, and this badge belongs over the map. */}
      <div className="absolute top-14 right-4 z-20 pointer-events-none">
        <div className="bg-stone-900/85 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-md flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-primary" />
          <span>{plural(listings.length, 'annonce géolocalisée', 'annonces géolocalisées')}</span>
        </div>
      </div>
    </div>
  );
};
