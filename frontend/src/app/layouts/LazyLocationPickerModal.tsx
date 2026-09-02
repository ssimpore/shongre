import React, { lazy, Suspense } from "react";
import { useMarketLocation } from "../providers/MarketLocationProvider";

const LocationPickerModal = lazy(() =>
  import("./LocationPickerModal").then((module) => ({
    default: module.LocationPickerModal,
  })),
);

/** Location controls are only downloaded when their modal is requested. */
export const LazyLocationPickerModal: React.FC = () => {
  const { isLocationModalOpen } = useMarketLocation();
  if (!isLocationModalOpen) return null;
  return (
    <Suspense fallback={null}>
      <LocationPickerModal />
    </Suspense>
  );
};
