import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PropertyPublic } from "@shongre/contracts/real-estate";

export const ImmoMap: React.FC<{
  properties: PropertyPublic[];
  selectedId?: string;
  onSelect: (property: PropertyPublic) => void;
  onBoundsChange?: (
    bounds: { north: number; east: number; south: number; west: number },
    center: { latitude: number; longitude: number },
  ) => void;
}> = ({ properties, selectedId, onSelect, onBoundsChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const programmaticMoveRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  const onBoundsChangeRef = useRef(onBoundsChange);
  onSelectRef.current = onSelect;
  onBoundsChangeRef.current = onBoundsChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false,
    }).setView([45.764, 4.8357], 12);
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      { maxZoom: 19, subdomains: "abcd" },
    ).addTo(map);
    const notifyBounds = () => {
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
    const notifyUserDrag = () => notifyBounds();
    const notifyUserZoom = () => {
      if (!programmaticMoveRef.current) notifyBounds();
    };
    const finishProgrammaticMove = () => {
      programmaticMoveRef.current = false;
    };
    map.on("dragend", notifyUserDrag);
    map.on("zoomend", notifyUserZoom);
    map.on("moveend", finishProgrammaticMove);
    mapRef.current = map;
    return () => {
      map.off("dragend", notifyUserDrag);
      map.off("zoomend", notifyUserZoom);
      map.off("moveend", finishProgrammaticMove);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    const bounds = L.latLngBounds([]);
    properties.forEach((property, index) => {
      const selected = property.id === selectedId;
      const icon = L.divIcon({
        className: "shongre-immo-marker",
        html: `<button type="button" aria-label="Afficher le bien ${index + 1}" class="grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-primary font-sans text-xs font-bold text-white shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected ? "ring-4 ring-primary-border scale-110" : ""}">${index + 1}</button>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      const latLng = L.latLng(
        property.address.latitude,
        property.address.longitude,
      );
      bounds.extend(latLng);
      // `keyboard: false` because the icon's own markup is already a real
      // <button>. Leaflet's keyboard support puts `role="button"` and
      // `tabindex="0"` on the wrapper it creates, which nested one button
      // inside another: axe reported `nested-interactive`, screen readers
      // announced "button, button", and the wrapper answered Enter but not
      // Space. Leaving the native control as the only interactive node gives
      // both keys, a real focus ring and correct semantics; the click still
      // bubbles from the button to this marker.
      const marker = L.marker(latLng, { icon, keyboard: false }).addTo(map);
      marker.on("click", () => onSelectRef.current(property));
      markersRef.current.push(marker);
      if (selected) {
        programmaticMoveRef.current = true;
        map.panTo(latLng, { animate: true });
      }
    });
    if (!selectedId && bounds.isValid()) {
      programmaticMoveRef.current = true;
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [properties, selectedId]);

  return (
    <div
      ref={containerRef}
      className="leaflet-container h-full min-h-112 w-full bg-bg-subtle"
      role="region"
      aria-label="Carte des biens immobiliers"
    />
  );
};
