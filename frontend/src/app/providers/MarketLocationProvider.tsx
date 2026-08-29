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
import {
  getCountryConfig,
  resolveMarketContext,
  type MarketContext,
} from "@shongre/contracts";
import { buildRuntimeMarketUrl } from "../../domains/market/market-routing";
import {
  currentRuntimeInternalPath,
  isDevelopmentMarketHost,
} from "../../domains/market/market-routing";
import { useAuth } from "./AuthProvider";
import { services } from "../../api/client/service-registry";
import { analyticsService } from "../../services/analytics.service";
import { marketInfrastructureFromPublicEnvironment } from "../../platform/market/market-infrastructure";

const INITIAL_DEFAULT_MARKET =
  INITIAL_MARKETS.find((market) => market.isDefault) ?? INITIAL_MARKETS[0];
const RUNTIME_MARKET_INFRASTRUCTURE =
  marketInfrastructureFromPublicEnvironment();
interface MarketContextType {
  marketContext: MarketContext | null;
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
  initialMarketContext?: MarketContext;
}> = ({ children, initialMarketContext }) => {
  const { isAuthenticated } = useAuth();
  const requestMarket = useMemo(
    () =>
      INITIAL_MARKETS.find(
        (market) => market.code === initialMarketContext?.countryCode,
      ) || INITIAL_DEFAULT_MARKET,
    [initialMarketContext?.countryCode],
  );
  const requestConfig = useMemo(
    () =>
      marketResolver.resolveEffectiveConfig(
        requestMarket,
        INITIAL_DEFAULT_MARKET,
      ),
    [requestMarket],
  );
  // Browser preferences cannot participate in the initial render: doing so
  // makes hydrated markup depend on localStorage. Restore them after mount.
  const [activeMarketCode, setActiveMarketCode] = useState<string>(
    initialMarketContext?.countryCode || INITIAL_DEFAULT_MARKET.code,
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
    if (!hasRestoredPreferences) {
      return requestMarket;
    }
    return marketService.getMarket(activeMarketCode);
  }, [
    activeMarketCode,
    hasRestoredPreferences,
    marketDataVersion,
    requestMarket,
  ]);

  const effectiveConfig = useMemo<MarketConfiguration>(() => {
    if (!hasRestoredPreferences) return requestConfig;
    return marketService.getEffectiveConfig(activeMarket.code);
  }, [activeMarket, hasRestoredPreferences, marketDataVersion, requestConfig]);

  const resolvedMarketContext = useMemo<MarketContext | null>(() => {
    if (initialMarketContext?.countryCode === activeMarket.code) {
      return initialMarketContext;
    }
    const country = getCountryConfig(activeMarket.code);
    if (!country) return null;
    const hostname = country.isDefault
      ? RUNTIME_MARKET_INFRASTRUCTURE.franceDomain
      : RUNTIME_MARKET_INFRASTRUCTURE.globalDomain;
    return resolveMarketContext({
      hostname,
      pathname: country.basePath,
      infrastructure: RUNTIME_MARKET_INFRASTRUCTURE,
      allowDevelopmentHosts: false,
    });
  }, [activeMarket.code, initialMarketContext]);

  const availableMarkets = useMemo<Market[]>(() => {
    if (!hasRestoredPreferences) {
      return INITIAL_MARKETS.filter((market) => {
        const country = getCountryConfig(market.code);
        return (
          (["active", "beta", "coming_soon"] as Market["status"][]).includes(
            market.status,
          ) && Boolean(country?.gatewayVisible || country?.marketplace.enabled)
        );
      });
    }
    return marketService.getMarkets().filter((market) => {
      const country = getCountryConfig(market.code);
      return (
        (["active", "beta", "coming_soon"] as Market["status"][]).includes(
          market.status,
        ) && Boolean(country?.gatewayVisible || country?.marketplace.enabled)
      );
    });
  }, [hasRestoredPreferences, marketDataVersion]);

  const [location, setLocationState] = useState<LocationSelection>({
    city: `Toute la ${requestMarket.name}`,
    postalCode: "",
    radiusKm: 0,
    label: `Toute la ${requestMarket.name}`,
  });

  const [currentLocale, setCurrentLocaleState] = useState<string>(
    requestConfig.localization.defaultLocale,
  );

  const [currentCurrency, setCurrentCurrencyState] = useState<string>(
    requestConfig.localization.defaultCurrency,
  );

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);

  useEffect(() => {
    const storedMarketCode = storageService.getActiveMarketCode();
    const resolvedMarketCode =
      initialMarketContext?.countryCode ||
      storedMarketCode ||
      INITIAL_DEFAULT_MARKET.code;
    const restoredMarket = marketService.getMarket(resolvedMarketCode);
    const restoredConfig = marketService.getEffectiveConfig(
      restoredMarket.code,
    );
    const isSameStoredMarket = storedMarketCode === restoredMarket.code;
    const restoredLocation = isSameStoredMarket
      ? storageService.getLocationPreference()
      : null;
    const storedLocale = isSameStoredMarket
      ? storageService.getUserLocale()
      : null;
    const storedCurrency = isSameStoredMarket
      ? storageService.getUserCurrency()
      : null;
    const defaultLocation: LocationSelection = {
      city: `Toute la ${restoredMarket.name}`,
      postalCode: "",
      radiusKm: 0,
      label: `Toute la ${restoredMarket.name}`,
    };

    setActiveMarketCode(restoredMarket.code);
    setLocationState(
      restoredLocation?.city ? restoredLocation : defaultLocation,
    );
    const shippedLocale = resolveShippedLocale(
      storedLocale || restoredConfig.localization.defaultLocale,
    );
    const marketLocale = restoredConfig.localization.defaultLocale;
    setCurrentLocaleState(
      shippedLocale.split("-")[0] === marketLocale.split("-")[0]
        ? marketLocale
        : shippedLocale,
    );
    setCurrentCurrencyState(
      storedCurrency || restoredConfig.localization.defaultCurrency,
    );
    if (!isSameStoredMarket) {
      storageService.saveLocationPreference(defaultLocation);
      storageService.saveUserLocale(
        shippedLocale.split("-")[0] === marketLocale.split("-")[0]
          ? marketLocale
          : shippedLocale,
      );
      storageService.saveUserCurrency(
        restoredConfig.localization.defaultCurrency,
      );
    }
    storageService.saveActiveMarketCode(restoredMarket.code);
    setHasRestoredPreferences(true);
  }, [initialMarketContext]);

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
    const shippedLocale = resolveShippedLocale(
      userLocale || effectiveConfig.localization.defaultLocale,
    );
    const marketLocale = effectiveConfig.localization.defaultLocale;
    const nextLocale =
      shippedLocale.split("-")[0] === marketLocale.split("-")[0]
        ? marketLocale
        : shippedLocale;
    setCurrentLocaleState(nextLocale);
    if (userLocale && userLocale !== nextLocale) {
      storageService.saveUserLocale(nextLocale);
    }
    const userCurr = storageService.getUserCurrency();
    if (!userCurr) {
      setCurrentCurrencyState(effectiveConfig.localization.defaultCurrency);
    }
  }, [effectiveConfig, hasRestoredPreferences]);

  const setLocale = useCallback(
    (locale: string) => {
      const shippedLocale = resolveShippedLocale(locale);
      const marketLocale = effectiveConfig.localization.defaultLocale;
      const regionalLocale =
        shippedLocale.split("-")[0] === marketLocale.split("-")[0]
          ? marketLocale
          : shippedLocale;
      setCurrentLocaleState(regionalLocale);
      storageService.saveUserLocale(regionalLocale);
      /* Taxonomy labels are resolved into the index when it is built, so the tree
       has to be rebuilt for a language change to reach category names. Without
       this, switching language re-rendered the chrome in English and left every
       category in the language the app happened to boot in. */
      taxonomyService.reload();
      refreshTaxonomyProjection(shippedLocale);
    },
    [effectiveConfig.localization.defaultLocale],
  );

  // Keep the document language in sync with the active locale. Screen readers
  // pick pronunciation from `<html lang>`, and it was pinned to the `fr` in
  // index.html no matter what the user selected.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = currentLocale;
  }, [currentLocale]);

  useEffect(() => {
    const country = getCountryConfig(activeMarket.code);
    if (!country) return;
    analyticsService.setMarketContext({
      country: country.code,
      locale: currentLocale,
      domain:
        typeof window === "undefined"
          ? country.canonicalDomainMode
          : window.location.hostname,
      market: country.code,
      currency: currentCurrency,
    });
  }, [activeMarket.code, currentCurrency, currentLocale]);

  const setCurrency = useCallback((currency: string) => {
    const clean = currency.toUpperCase();
    setCurrentCurrencyState(clean);
    storageService.saveUserCurrency(clean);
  }, []);

  const setMarket = useCallback(
    (newMarketCode: string) => {
      const market = marketService.getMarketByCode(newMarketCode);
      if (!market) return;
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
      if (initialMarketContext && typeof window !== "undefined") {
        const directDestination = buildRuntimeMarketUrl({
          targetCountry: market.code,
          context: initialMarketContext,
          infrastructure: RUNTIME_MARKET_INFRASTRUCTURE,
        });
        const sourceCountry = getCountryConfig(
          initialMarketContext.countryCode || activeMarketCode,
        );
        const targetCountry = getCountryConfig(market.code);
        const crossesRegistrableDomain =
          sourceCountry &&
          targetCountry &&
          sourceCountry.canonicalDomainMode !==
            targetCountry.canonicalDomainMode;
        const canHandoff =
          isAuthenticated &&
          crossesRegistrableDomain &&
          !isDevelopmentMarketHost(window.location.hostname);

        if (canHandoff) {
          void services.auth
            .beginDomainHandoff({
              sourceCountry: sourceCountry.code,
              targetCountry: targetCountry.code,
              returnTo: currentRuntimeInternalPath(initialMarketContext),
            })
            .then(({ authorizationUrl }) =>
              window.location.assign(authorizationUrl),
            )
            .catch(() => window.location.assign(directDestination));
          return;
        }
        window.location.assign(directDestination);
      }
    },
    [activeMarketCode, initialMarketContext, isAuthenticated],
  );

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
        marketContext: resolvedMarketContext,
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
