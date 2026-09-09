import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { MapCanvas } from "../../../design-system/primitives/MapCanvas";

type Coordinates = { latitude: number; longitude: number };

/**
 * Where the seller says the property is, before it is published.
 *
 * A real pin here, unlike the public map: this is the owner setting their own
 * location, and the value they place is what the public projection later
 * rounds. Precision belongs at the point of entry; blurring belongs at the
 * point of publication.
 */
export const ImmoLocationPicker: React.FC<{
  value: Coordinates;
  onChange: (coordinates: Coordinates) => void;
}> = ({ value, onChange }) => {
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // The marker follows a value changed elsewhere in the form without the map
  // being torn down and rebuilt under the seller's cursor.
  useEffect(() => {
    markerRef.current?.setLatLng([value.latitude, value.longitude]);
  }, [value.latitude, value.longitude]);

  return (
    <MapCanvas
      surface="immo-location-picker"
      center={{
        latitude: value.latitude,
        longitude: value.longitude,
        zoom: 14,
      }}
      ariaLabel="Position approximative du bien"
      className="h-64 w-full rounded-card border border-border-base bg-bg-subtle"
      onReady={(map) => {
        const marker = L.marker([value.latitude, value.longitude], {
          draggable: true,
          icon: L.divIcon({
            className: "shongre-immo-location-marker",
            html: '<span class="block h-5 w-5 rounded-full border-4 border-border-on-inverse bg-primary shadow-md"></span>',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          }),
        }).addTo(map);
        const emit = (latLng: L.LatLng) =>
          onChangeRef.current({ latitude: latLng.lat, longitude: latLng.lng });
        const onDragEnd = () => emit(marker.getLatLng());
        const onClick = (event: L.LeafletMouseEvent) => {
          marker.setLatLng(event.latlng);
          emit(event.latlng);
        };
        marker.on("dragend", onDragEnd);
        map.on("click", onClick);
        markerRef.current = marker;
        return () => {
          marker.off("dragend", onDragEnd);
          map.off("click", onClick);
          marker.remove();
          markerRef.current = null;
        };
      }}
    />
  );
};
