import React, { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker } from "maplibre-gl";
import type { PropertyPublic } from "@shongre/contracts/real-estate";
import { MapContainer } from "../../../design-system/primitives/map/MapContainer";
import {
  createMarkerElement,
  fitToCoordinates,
} from "../../../design-system/primitives/map/map-layers";

export const ImmoMap: React.FC<{
  properties: PropertyPublic[];
  selectedId?: string;
  onSelect: (property: PropertyPublic) => void;
  onBoundsChange?: (
    bounds: { north: number; east: number; south: number; west: number },
    center: { latitude: number; longitude: number },
  ) => void;
}> = ({ properties, selectedId, onSelect, onBoundsChange }) => {
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const onSelectRef = useRef(onSelect);
  const onBoundsChangeRef = useRef(onBoundsChange);
  /* The marker effect reads the map from a ref, so it needs a state change to
     depend on; otherwise it runs once against a null map and never again. */
  const [isMapReady, setIsMapReady] = useState(false);
  onSelectRef.current = onSelect;
  onBoundsChangeRef.current = onBoundsChange;

  const attachHandlers = (map: MapLibreMap) => {
    mapRef.current = map;
    setIsMapReady(true);
    const notifyBounds = (event: { originalEvent?: unknown }) => {
      /*
       * Only a move the reader made counts as asking to search somewhere else.
       *
       * `moveend` fires for far more than dragging: a programmatic `panTo`, a
       * `fitBounds`, and — the one that caused a visible bug — a `resize` when
       * the filter panel beside the map collapses. That last one silently
       * applied a viewport filter nobody asked for, so hiding the filters
       * dropped the result count. MapLibre only sets `originalEvent` for a real
       * gesture, which separates the two cases exactly; a flag set before each
       * of this component's own moves could not, because it never saw the
       * resize coming.
       */
      if (!event.originalEvent) return;
      const bounds = map.getBounds();
      const center = map.getCenter();
      onBoundsChangeRef.current?.(
        {
          north: bounds.getNorth(),
          east: bounds.getEast(),
          south: bounds.getSouth(),
          west: bounds.getWest(),
        },
        { latitude: center.lat, longitude: center.lng },
      );
    };
    map.on("moveend", notifyBounds);
    return () => {
      map.off("moveend", notifyBounds);
      mapRef.current = null;
      setIsMapReady(false);
    };
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    const coordinates: Array<{ latitude: number; longitude: number }> = [];

    properties.forEach((property, index) => {
      const selected = property.id === selectedId;
      const coordinate = {
        latitude: property.address.latitude,
        longitude: property.address.longitude,
      };
      coordinates.push(coordinate);
      /* The marker element is a real <button>, so a screen reader announces one
         control and both Enter and Space activate it. The previous renderer
         wrapped its icon in another focusable node, which axe reported as
         `nested-interactive` and which answered Enter but not Space. */
      const marker = new Marker({
        element: createMarkerElement({
          label: `Afficher le bien ${index + 1}`,
          text: String(index + 1),
          selected,
          onSelect: () => onSelectRef.current(property),
        }),
      })
        .setLngLat([coordinate.longitude, coordinate.latitude])
        .addTo(map);
      markersRef.current.push(marker);
      if (selected) map.panTo([coordinate.longitude, coordinate.latitude]);
    });

    if (!selectedId && coordinates.length) {
      fitToCoordinates(map, coordinates, { padding: 40, maxZoom: 13 });
    }
  }, [isMapReady, properties, selectedId]);

  return (
    // The wrapper carries the hook every search surface publishes for its map
    // panel; the canvas inside it is the map itself and stays layout-neutral.
    <div data-search-results-map className="h-full min-h-112 w-full">
      <MapContainer
        surface="immo-results"
        center={{ latitude: 45.764, longitude: 4.8357, zoom: 12 }}
        ariaLabel="Carte des biens immobiliers"
        className="h-full w-full bg-bg-subtle"
        onReady={attachHandlers}
      />
    </div>
  );
};
