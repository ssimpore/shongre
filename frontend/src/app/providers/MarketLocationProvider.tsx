import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { LocationSelection } from "../../types";
import {
  Market,
  MarketConfiguration,
  MarketCity,
} from "../../domains/market/market.types";
import { marketService } from "../../domains/market/market.service";
import {
  MARKETS_CHANGED_EVENT,
  MARKETS_STORAGE_KEY,
  storageService,
} from "../../services/storage.service";
import {
  formatCurrencySymbol,
  formatPrice as formatPriceUtil,
} from "../../utilities/formatters";
import { taxonomyService } from "../../domains/taxonomy/taxonomy.service";
import { refreshTaxonomyProjection } from "../../domains/taxonomy/taxonomy.data";
import { resolveShippedLocale } from "../../i18n/locale";
import { INITIAL_MARKETS } from "../../domains/market/market.defaults";
import { marketResolver } from "../../domains/market/market.resolver";

const INITIAL_DEFAULT_MARKET =
  INITIAL_MARKETS.find((market) => market.isDefault) ?? INITIAL_MARKETS[0];
const INITIAL_DEFAULT_CONFIG = marketResolver.resolveEffectiveConfig(
  INITIAL_DEFAULT_MARKET,
  INITIAL_DEFAULT_MARKET,
);

interface MarketContextType {
  activeMarket: Market;
  effectiveConfig: MarketConfiguration;
  availableMarkets: Market[];
  setMarket: (marketCode: string) => void;
  location: LocationSelection;
  setLocation: (loc: LocationSelection) => void;
  resetLocation: () => void;
  popularCities: MarketCity[];
  currentLocale: string;
  setLocale: (locale: string) => void;
  currentCurrency: string;
  setCurrency: (currency: string) => void;
  currencySymbol: string;
  formatPrice: (
    amount: number,
    options?: { showCurrency?: boolean; isFreeDonation?: boolean },
  ) => string;
  isLocationModalOpen: boolean;
  openLocationModal: () => void;
  closeLocationModal: () => void;
  isPreferencesModalOpen: boolean;
  openPreferencesModal: () => void;
  closePreferencesModal: () => void;
}

const MarketLocationContext = createContext<MarketContextType | undefined>(
  undefined,
);

export const MarketLocationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  // Browser preferences cannot participate in the initial render: doing so
  // makes hydrated markup depend on localStorage. Restore them after mount.
  const [activeMarketCode, setActiveMarketCode] = useState<string>(
    INITIAL_DEFAULT_MARKET.code,
  );
  const [marketDataVersion, setMarketDataVersion] = useState(0);
  const [hasRestoredPreferences, setHasRestoredPreferences] = useState(false);

  useEffect(() => {
    const refreshMarketConfiguration = () => {
      setMarketDataVersion((version) => version + 1);
    };
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === null || event.key === MARKETS_STORAGE_KEY) {
        refreshMarketConfiguration();
      }
    };

    window.addEventListener(MARKETS_CHANGED_EVENT, refreshMarketConfiguration);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(
        MARKETS_CHANGED_EVENT,
        refreshMarketConfiguration,
      );
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const activeMarket = useMemo<Market>(() => {
    if (!hasRestoredPreferences) return INITIAL_DEFAULT_MARKET;
    return marketService.getMarket(activeMarketCode);
  }, [activeMarketCode, hasRestoredPreferences, marketDataVersion]);

  const effectiveConfig = useMemo<MarketConfiguration>(() => {
    if (!hasRestoredPreferences) return INITIAL_DEFAULT_CONFIG;
    return marketService.getEffectiveConfig(activeMarket.code);
  }, [activeMarket, hasRestoredPreferences, marketDataVersion]);

  const availableMarkets = useMemo<Market[]>(() => {
    if (!hasRestoredPreferences) {
      return INITIAL_MARKETS.filter(
        (market) =>
          market.status === "active" || market.status === "coming_soon",
      );
    }
    return marketService
      .getMarkets()
      .filter((m) => m.status === "active" || m.status === "coming_soon");
  }, [hasRestoredPreferences, marketDataVersion]);

  const [location, setLocationState] = useState<LocationSelection>({
    city: `Toute la ${INITIAL_DEFAULT_MARKET.name}`,
    postalCode: "",
    radiusKm: 0,
    label: `Toute la ${INITIAL_DEFAULT_MARKET.name}`,
  });

  const [currentLocale, setCurrentLocaleState] = useState<string>(
    resolveShippedLocale(INITIAL_DEFAULT_CONFIG.localization.defaultLocale),
  );

  const [currentCurrency, setCurrentCurrencyState] = useState<string>(
    INITIAL_DEFAULT_CONFIG.localization.defaultCurrency,
  );

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);

  useEffect(() => {
    const restoredMarket = marketService.getMarket(
      storageService.getActiveMarketCode() || INITIAL_DEFAULT_MARKET.code,
    );
    const restoredConfig = marketService.getEffectiveConfig(
      restoredMarket.code,
    );
    const restoredLocation = storageService.getLocationPreference();

    setActiveMarketCode(restoredMarket.code);
    setLocationState(
      restoredLocation?.city
        ? restoredLocation
        : {
            city: `Toute la ${restoredMarket.name}`,
            postalCode: "",
            radiusKm: 0,
            label: `Toute la ${restoredMarket.name}`,
          },
    );
    setCurrentLocaleState(
      resolveShippedLocale(
        storageService.getUserLocale() ||
          restoredConfig.localization.defaultLocale,
      ),
    );
    setCurrentCurrencyState(
      storageService.getUserCurrency() ||
        restoredConfig.localization.defaultCurrency,
    );
    setHasRestoredPreferences(true);
  }, []);

  const openLocationModal = useCallback(() => {
    setIsLocationModalOpen(true);
  }, []);

  const closeLocationModal = useCallback(() => {
    setIsLocationModalOpen(false);
  }, []);

  const openPreferencesModal = useCallback(() => {
    setIsPreferencesModalOpen(true);
  }, []);

  const closePreferencesModal = useCallback(() => {
    setIsPreferencesModalOpen(false);
  }, []);

  // Sync when market changes if no explicit user override
  useEffect(() => {
    if (!hasRestoredPreferences) return;
    const userLocale = storageService.getUserLocale();
    const nextLocale = resolveShippedLocale(
      userLocale || effectiveConfig.localization.defaultLocale,
    );
    setCurrentLocaleState(nextLocale);
    if (userLocale && userLocale !== nextLocale) {
      storageService.saveUserLocale(nextLocale);
    }
    const userCurr = storageService.getUserCurrency();
    if (!userCurr) {
      setCurrentCurrencyState(effectiveConfig.localization.defaultCurrency);
    }
  }, [effectiveConfig, hasRestoredPreferences]);

  const setLocale = useCallback((locale: string) => {
    const shippedLocale = resolveShippedLocale(locale);
    setCurrentLocaleState(shippedLocale);
    storageService.saveUserLocale(shippedLocale);
    /* Taxonomy labels are resolved into the index when it is built, so the tree
       has to be rebuilt for a language change to reach category names. Without
       this, switching language re-rendered the chrome in English and left every
       category in the language the app happened to boot in. */
    taxonomyService.reload();
    refreshTaxonomyProjection(shippedLocale);
  }, []);

  // Keep the document language in sync with the active locale. Screen readers
  // pick pronunciation from `<html lang>`, and it was pinned to the `fr` in
  // index.html no matter what the user selected.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = currentLocale;
  }, [currentLocale]);

  const setCurrency = useCallback((currency: string) => {
    const clean = currency.toUpperCase();
    setCurrentCurrencyState(clean);
    storageService.saveUserCurrency(clean);
  }, []);

  const setMarket = useCallback((newMarketCode: string) => {
    const market = marketService.getMarket(newMarketCode);
    setActiveMarketCode(market.code);
    storageService.saveActiveMarketCode(market.code);

    const defaultLoc: LocationSelection = {
      city: `Toute la ${market.name}`,
      postalCode: "",
      radiusKm: 0,
      label: `Toute la ${market.name}`,
    };
    setLocationState(defaultLoc);
    storageService.saveLocationPreference(defaultLoc);
  }, []);

  const setLocation = useCallback((loc: LocationSelection) => {
    setLocationState(loc);
    storageService.saveLocationPreference(loc);
  }, []);

  const resetLocation = useCallback(() => {
    const defaultLoc: LocationSelection = {
      city: `Toute la ${activeMarket.name}`,
      postalCode: "",
      radiusKm: 0,
      label: `Toute la ${activeMarket.name}`,
    };
    setLocation(defaultLoc);
  }, [activeMarket, setLocation]);

  const popularCities = useMemo<MarketCity[]>(() => {
    return activeMarket.geography?.popularCities || [];
  }, [activeMarket]);

  const currencySymbol = useMemo<string>(() => {
    return formatCurrencySymbol(currentCurrency, currentLocale);
  }, [currentCurrency, currentLocale]);

  const formatPrice = useCallback(
    (
      amount: number,
      options?: { showCurrency?: boolean; isFreeDonation?: boolean },
    ) => {
      return formatPriceUtil(amount, {
        ...options,
        locale: currentLocale,
        currency: currentCurrency,
      });
    },
    [currentLocale, currentCurrency],
  );

  return (
    <MarketLocationContext.Provider
      value={{
        activeMarket,
        effectiveConfig,
        availableMarkets,
        setMarket,
        location,
        setLocation,
        resetLocation,
        popularCities,
        currentLocale,
        setLocale,
        currentCurrency,
        setCurrency,
        currencySymbol,
        formatPrice,
        isLocationModalOpen,
        openLocationModal,
        closeLocationModal,
        isPreferencesModalOpen,
        openPreferencesModal,
        closePreferencesModal,
      }}
    >
      {children}
    </MarketLocationContext.Provider>
  );
};

export function useMarketLocation(): MarketContextType {
  const ctx = useContext(MarketLocationContext);
  if (!ctx)
    throw new Error(
      "useMarketLocation must be used within MarketLocationProvider",
    );
  return ctx;
}

export function useMarket(): MarketContextType {
  return useMarketLocation();
}

export function useMarketConfig(): MarketConfiguration {
  const { effectiveConfig } = useMarketLocation();
  return effectiveConfig;
}
