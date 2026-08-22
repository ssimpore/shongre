import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Coordinates = { latitude: number; longitude: number };

export const ImmoLocationPicker: React.FC<{
  value: Coordinates;
  onChange: (coordinates: Coordinates) => void;
}> = ({ value, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false,
    }).setView([value.latitude, value.longitude], 14);
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      { maxZoom: 19, subdomains: "abcd" },
    ).addTo(map);
    const marker = L.marker([value.latitude, value.longitude], {
      draggable: true,
      icon: L.divIcon({
        className: "shongre-immo-location-marker",
        html: '<span class="block h-5 w-5 rounded-full border-4 border-white bg-primary shadow-card"></span>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      }),
    }).addTo(map);
    const emit = (latLng: L.LatLng) =>
      onChangeRef.current({ latitude: latLng.lat, longitude: latLng.lng });
    marker.on("dragend", () => emit(marker.getLatLng()));
    map.on("click", (event: L.LeafletMouseEvent) => {
      marker.setLatLng(event.latlng);
      emit(event.latlng);
    });
    mapRef.current = map;
    markerRef.current = marker;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    markerRef.current?.setLatLng([value.latitude, value.longitude]);
  }, [value.latitude, value.longitude]);

  return (
    <div
      ref={containerRef}
      className="leaflet-container h-64 w-full rounded-card border border-border-base bg-bg-subtle"
      role="region"
      aria-label="Position approximative du bien"
    />
  );
};
