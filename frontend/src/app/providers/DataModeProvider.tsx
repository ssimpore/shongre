import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { LoaderCircle, RotateCw } from "lucide-react";

import type { DataMode } from "../../api/client/api-client.config";
import {
  DATA_MODE_STORAGE_KEY,
  dataModeService,
  LiveModeError,
} from "../../api/client/data-mode.service";
import { activateServiceRegistry } from "../../api/client/service-registry";
import { Button } from "../../design-system/primitives/Button";
import { DEFAULT_LOCALE, translate } from "../../i18n/i18n.service";
import type { MessageKey } from "../../i18n/messages.fr";

type LiveAvailability = "ready" | "checking" | "unavailable";

interface DataModeContextValue {
  mode: DataMode;
  isSwitching: boolean;
  liveApiConfigured: boolean;
  selectMode: (mode: DataMode) => Promise<void>;
}

const DataModeContext = createContext<DataModeContextValue | undefined>(
  undefined,
);

const copy = (key: MessageKey): string => translate(key, DEFAULT_LOCALE);

function liveErrorMessage(error: unknown): string {
  if (
    error instanceof LiveModeError &&
    error.code === "LIVE_API_NOT_CONFIGURED"
  ) {
    return copy("shell.dataMode.liveConfigurationError");
  }
  return copy("shell.dataMode.liveUnavailableBootError");
}

export const DataModeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mode, setMode] = useState<DataMode>(() =>
    dataModeService.getActiveMode(),
  );
  const [availability, setAvailability] = useState<LiveAvailability>(() =>
    mode === "api" ? "checking" : "ready",
  );
  const [availabilityError, setAvailabilityError] = useState<string>("");
  const [isSwitching, setIsSwitching] = useState(false);

  const checkActiveMode = useCallback(async () => {
    if (mode !== "api") {
      setAvailability("ready");
      setAvailabilityError("");
      return;
    }

    setAvailability("checking");
    setAvailabilityError("");
    try {
      await dataModeService.assertLiveAvailable();
      setAvailability("ready");
    } catch (error) {
      setAvailability("unavailable");
      setAvailabilityError(liveErrorMessage(error));
    }
  }, [mode]);

  useEffect(() => {
    void checkActiveMode();
  }, [checkActiveMode]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== DATA_MODE_STORAGE_KEY) return;
      const storedMode = dataModeService.getActiveMode();
      if (storedMode !== mode) window.location.reload();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [mode]);

  const selectMode = useCallback(
    async (nextMode: DataMode) => {
      if (nextMode === mode) return;
      setIsSwitching(true);
      try {
        // The availability check happens before either persistence or adapter
        // rebinding, so a failed Live request leaves the current mode intact.
        await dataModeService.selectMode(nextMode);
        activateServiceRegistry(nextMode);
        setMode(nextMode);

        // A full refresh deliberately discards QueryClient, auth, favourites,
        // notifications, open controllers and route-local caches. Demo state
        // remains namespaced in its adapter storage and is never reused by the
        // HTTP adapters.
        window.location.reload();
      } finally {
        setIsSwitching(false);
      }
    },
    [mode],
  );

  const value = useMemo<DataModeContextValue>(
    () => ({
      mode,
      isSwitching,
      liveApiConfigured: dataModeService.isLiveConfigured(),
      selectMode,
    }),
    [mode, isSwitching, selectMode],
  );

  if (availability === "checking") {
    return (
      <div className="min-h-screen bg-bg-base px-6 py-16 text-stone-900">
        <div
          role="status"
          className="mx-auto flex max-w-md flex-col items-center rounded-card border border-border-base bg-bg-surface p-8 text-center shadow-xs"
        >
          <LoaderCircle
            className="mb-4 h-8 w-8 animate-spin text-primary"
            aria-hidden="true"
          />
          <h1 className="text-lg font-bold">
            {copy("shell.dataMode.liveCheckingTitle")}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {copy("shell.dataMode.liveCheckingDescription")}
          </p>
        </div>
      </div>
    );
  }

  if (availability === "unavailable") {
    return (
      <div className="min-h-screen bg-bg-base px-6 py-16 text-stone-900">
        <div
          role="alert"
          className="mx-auto flex max-w-lg flex-col items-center rounded-card border border-danger-border bg-bg-surface p-8 text-center shadow-xs"
        >
          <span className="rounded-control bg-danger-surface px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-danger">
            {copy("shell.dataMode.liveUnavailableLabel")}
          </span>
          <h1 className="mt-4 text-lg font-bold">
            {copy("shell.dataMode.liveUnavailableTitle")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            {availabilityError}
          </p>
          <p className="mt-2 text-xs text-text-muted">
            {copy("shell.dataMode.noSilentFallback")}
          </p>
          <Button
            variant="primary"
            className="mt-6"
            onClick={() => void checkActiveMode()}
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            {copy("common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DataModeContext.Provider value={value}>
      {children}
    </DataModeContext.Provider>
  );
};

export function useDataMode(): DataModeContextValue {
  const context = useContext(DataModeContext);
  if (!context) {
    throw new Error("useDataMode must be used inside <DataModeProvider>.");
  }
  return context;
}
