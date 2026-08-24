import React, { useState, useEffect } from "react";
import {
  MapPin,
  Check,
  Navigation,
  LocateFixed,
  LoaderCircle,
} from "lucide-react";
import { Modal } from "../../design-system/primitives/Modal";
import { Button } from "../../design-system/primitives/Button";
import { Input } from "../../design-system/primitives/FormField";
import { IconButton } from "../../design-system/primitives/IconButton";
import { useMarketLocation } from "../providers/MarketLocationProvider";
import { LocationSelection } from "../../types";
import { useTranslation } from "../../i18n/I18nProvider";
import {
  CurrentLocationError,
  GeolocationFailureCode,
  locateCurrentCity,
} from "../../domains/market/geolocation.service";

type GeolocationState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "success"; city: string }
  | { status: "error"; code: GeolocationFailureCode };

export const LocationPickerModal: React.FC = () => {
  const { t } = useTranslation();
  const {
    activeMarket,
    location,
    setLocation,
    resetLocation,
    popularCities,
    isLocationModalOpen,
    closeLocationModal,
  } = useMarketLocation();

  const isWholeCountry =
    location.city.startsWith("Tout") || location.city.startsWith("Toute");
  const [cityInput, setCityInput] = useState(
    isWholeCountry ? "" : location.city,
  );
  const [radius, setRadius] = useState<number>(location.radiusKm || 0);
  const [geolocationState, setGeolocationState] = useState<GeolocationState>({
    status: "idle",
  });

  useEffect(() => {
    if (!isLocationModalOpen) return;
    if (isWholeCountry) {
      setCityInput("");
    } else {
      setCityInput(location.city);
    }
    setRadius(location.radiusKm || 0);
    setGeolocationState({ status: "idle" });
  }, [isLocationModalOpen, location, isWholeCountry]);

  const radiusOptions = [0, 10, 20, 30, 50, 100];
  const wholeCountryLabel = `Toute la ${activeMarket.name}`;

  const handleApply = () => {
    if (!cityInput.trim()) {
      resetLocation();
    } else {
      const match = popularCities.find(
        (c) => c.name.toLowerCase() === cityInput.trim().toLowerCase(),
      );
      const newLoc: LocationSelection = {
        city: cityInput.trim(),
        postalCode: match ? match.postalCode : "",
        department: match ? match.department : "",
        region: match ? match.region : "",
        radiusKm: radius,
        label:
          radius > 0 ? `${cityInput.trim()} (+${radius} km)` : cityInput.trim(),
      };
      setLocation(newLoc);
    }
    closeLocationModal();
  };

  const handleSelectCity = (c: (typeof popularCities)[0]) => {
    setCityInput(c.name);
    setGeolocationState({ status: "idle" });
  };

  const handleUseCurrentLocation = async () => {
    if (geolocationState.status === "locating") return;
    setGeolocationState({ status: "locating" });

    try {
      const result = await locateCurrentCity(activeMarket.code, popularCities);
      setCityInput(result.city.name);
      setGeolocationState({ status: "success", city: result.city.name });
    } catch (error) {
      setGeolocationState({
        status: "error",
        code:
          error instanceof CurrentLocationError
            ? error.code
            : "position_unavailable",
      });
    }
  };

  const geolocationMessage = (() => {
    if (geolocationState.status === "locating") {
      return t("shell.locationPickerModal.locationInProgress");
    }
    if (geolocationState.status === "success") {
      return t("shell.locationPickerModal.locationDetected", {
        city: geolocationState.city,
      });
    }
    if (geolocationState.status !== "error") return "";

    const keyByCode = {
      unsupported: "shell.locationPickerModal.locationUnsupported",
      permission_denied: "shell.locationPickerModal.locationPermissionDenied",
      position_unavailable: "shell.locationPickerModal.locationUnavailable",
      timeout: "shell.locationPickerModal.locationTimeout",
      outside_market: "shell.locationPickerModal.locationOutsideMarket",
      unresolved: "shell.locationPickerModal.locationUnresolved",
    } as const;
    return t(keyByCode[geolocationState.code], {
      market: activeMarket.name,
    });
  })();

  const examplePlaceholder =
    popularCities.length >= 2
      ? `ex: ${popularCities[0].name}, ${popularCities[1].name}, ${popularCities[0].postalCode}...`
      : "ex: Paris, Lyon, 75001...";

  return (
    <Modal
      isOpen={isLocationModalOpen}
      onClose={closeLocationModal}
      title={t("shell.locationPickerModal.zoneGeographique")}
      description={`Trouvez des annonces près de chez vous ou partout en ${activeMarket.name} (${activeMarket.flag})`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Whole country option */}
        <button
          type="button"
          onClick={() => {
            resetLocation();
            closeLocationModal();
          }}
          className={`w-full min-h-control-touch px-3 rounded-control border flex items-center justify-between motion-interactive cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            isWholeCountry
              ? "border-primary bg-primary-light text-primary font-bold"
              : "border-border-base hover:border-stone-400 bg-white text-stone-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Navigation className="w-4 h-4 text-primary" />
            <span className="text-xs sm:text-sm">{wholeCountryLabel}</span>
          </div>
          {isWholeCountry && (
            <Check className="w-4 h-4 text-primary shrink-0" />
          )}
        </button>

        {/* City input */}
        <div className="space-y-1.5">
          <label
            htmlFor="location-city-input"
            className="text-xs font-bold text-stone-700 uppercase tracking-wider"
          >
            Ville ou Code Postal ({activeMarket.name})
          </label>
          <Input
            id="location-city-input"
            placeholder={examplePlaceholder}
            value={cityInput}
            onChange={(e) => {
              setCityInput(e.target.value);
              setGeolocationState({ status: "idle" });
            }}
            leftIcon={<MapPin className="w-4 h-4" />}
            aria-describedby={
              geolocationMessage ? "location-geolocation-status" : undefined
            }
            rightIcon={
              <IconButton
                size="sm"
                variant="ghost"
                ariaLabel={
                  geolocationState.status === "locating"
                    ? t("shell.locationPickerModal.locationInProgress")
                    : t("shell.locationPickerModal.useCurrentLocation")
                }
                onClick={handleUseCurrentLocation}
                disabled={geolocationState.status === "locating"}
                aria-busy={geolocationState.status === "locating"}
                className="text-primary hover:text-primary-hover"
              >
                {geolocationState.status === "locating" ? (
                  <LoaderCircle
                    className="h-icon-sm w-icon-sm motion-safe:animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <LocateFixed
                    className="h-icon-sm w-icon-sm"
                    aria-hidden="true"
                  />
                )}
              </IconButton>
            }
          />
          {geolocationMessage ? (
            <p
              id="location-geolocation-status"
              role={geolocationState.status === "error" ? "alert" : "status"}
              className={`text-xs ${
                geolocationState.status === "error"
                  ? "text-danger"
                  : geolocationState.status === "success"
                    ? "text-success"
                    : "text-text-secondary"
              }`}
            >
              {geolocationMessage}
            </p>
          ) : null}
        </div>

        {/* Radius selector */}
        {cityInput.trim() && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex justify-between">
              <span>{t("shell.locationPickerModal.rayonDeRecherche")}</span>
              <span className="text-primary font-semibold">
                {radius === 0 ? "Ville exacte" : `+ ${radius} km`}
              </span>
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {radiusOptions.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadius(r)}
                  className={`h-control-sm rounded-control text-xs font-semibold border motion-interactive cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    radius === r
                      ? "bg-primary text-white border-primary"
                      : "bg-stone-50 border-border-base text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  {r === 0 ? "Exact" : `${r}km`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Popular Cities in Active Market */}
        {popularCities.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-micro font-bold text-text-muted uppercase tracking-wider">
              Villes populaires ({activeMarket.name})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {popularCities.map((city) => (
                <button
                  key={city.name}
                  type="button"
                  onClick={() => handleSelectCity(city)}
                  className={`h-control-sm px-2.5 rounded-pill text-xs font-medium border motion-interactive cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    cityInput.toLowerCase() === city.name.toLowerCase()
                      ? "bg-stone-900 text-white border-stone-900"
                      : "bg-white border-border-base text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  {city.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
          <Button variant="ghost" size="sm" onClick={closeLocationModal}>
            Annuler
          </Button>
          <Button variant="primary" size="sm" onClick={handleApply}>
            {t("shell.locationPickerModal.appliquerLaZone")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
