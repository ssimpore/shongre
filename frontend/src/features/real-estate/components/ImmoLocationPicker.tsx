import React, { useEffect, useRef } from "react";
import { Marker, type MapMouseEvent } from "maplibre-gl";
import { MapContainer } from "../../../design-system/primitives/map/MapContainer";
import { createMarkerElement } from "../../../design-system/primitives/map/map-layers";

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
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // The marker follows a value changed elsewhere in the form without the map
  // being torn down and rebuilt under the seller's cursor.
  useEffect(() => {
    markerRef.current?.setLngLat([value.longitude, value.latitude]);
  }, [value.latitude, value.longitude]);

  return (
    <MapContainer
      surface="immo-location-picker"
      center={{
        latitude: value.latitude,
        longitude: value.longitude,
        zoom: 14,
      }}
      ariaLabel="Position approximative du bien"
      className="h-64 w-full overflow-hidden rounded-listing-card border border-border-base bg-bg-subtle"
      onReady={(map) => {
        const marker = new Marker({
          element: createMarkerElement({
            label: "Position du bien — faites glisser pour ajuster",
          }),
          draggable: true,
        })
          .setLngLat([value.longitude, value.latitude])
          .addTo(map);

        const emit = () => {
          const { lat, lng } = marker.getLngLat();
          onChangeRef.current({ latitude: lat, longitude: lng });
        };
        const onClick = (event: MapMouseEvent) => {
          marker.setLngLat(event.lngLat);
          emit();
        };
        marker.on("dragend", emit);
        map.on("click", onClick);
        markerRef.current = marker;
        return () => {
          marker.off("dragend", emit);
          map.off("click", onClick);
          marker.remove();
          markerRef.current = null;
        };
      }}
    />
  );
};
