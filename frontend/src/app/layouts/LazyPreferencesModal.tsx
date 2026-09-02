import React, { lazy, Suspense } from "react";
import { useMarketLocation } from "../providers/MarketLocationProvider";

const PreferencesModal = lazy(() =>
  import("./PreferencesModal").then((module) => ({
    default: module.PreferencesModal,
  })),
);

/** Preference controls are only downloaded when their modal is requested. */
export const LazyPreferencesModal: React.FC = () => {
  const { isPreferencesModalOpen } = useMarketLocation();
  if (!isPreferencesModalOpen) return null;
  return (
    <Suspense fallback={null}>
      <PreferencesModal />
    </Suspense>
  );
};
