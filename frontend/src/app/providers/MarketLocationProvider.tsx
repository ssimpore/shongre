import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { LocationSelection } from "../../types";
import {
  Market,
  MarketConfiguration,
  MarketCity,
} from "../../domains/market/market.types";
import {
  MARKETS_CHANGED_EVENT,
  MARKETS_STORAGE_KEY,
  storageService,
} from "../../services/storage.service";
import {
  formatCurrencySymbol,
  formatPrice as formatPriceUtil,
} from "../../utilities/formatters";
import { resolveShippedLocale } from "../../i18n/locale";
import { INITIAL_MARKETS } from "../../domains/market/market.defaults";
import { marketResolver } from "../../domains/market/market.resolver";
import { normalizePriceFilterStops } from "../../domains/market/market.constants";
import {
  getCountryConfig,
  listPublicCountries,
  resolveMarketContext,
  type MarketDetectionRecommendation,
  type MarketContext,
  type PublicCountryConfig,
} from "@shongre/contracts";
import { buildRuntimeMarketUrl } from "../../domains/market/market-routing";
import {
  crossesProductionMarketOrigin,
  currentRuntimeInternalPath,
  shouldUseAuthenticatedMarketHandoff,
} from "../../domains/market/market-routing";
import { useAuth } from "./AuthProvider";
import { services } from "../../api/client/service-registry";
import { analyticsService } from "../../services/analytics.service";
import { marketInfrastructureFromPublicEnvironment } from "../../platform/market/market-infrastructure";
import {
  CurrentLocationError,
  requestCurrentCoordinates,
  resolveNearestMarketCity,
  type ResolvedCurrentLocation,
} from "../../domains/market/geolocation.service";
import {
  consumeManualMarketSelectionHandoff,
  marketSelectionPreferenceRepository,
  MANUAL_MARKET_SELECTION_QUERY,
  resolveInitialMarketSelection,
} from "../../domains/market/market-selection.preference";
import { marketDetectionController } from "../../domains/market/market-detection.controller";
import { resolveMarketDetectionOutcome } from "../../domains/market/market-detection.policy";

const INITIAL_DEFAULT_MARKET =
  INITIAL_MARKETS.find((market) => market.isDefault) ?? INITIAL_MARKETS[0];
const RUNTIME_MARKET_INFRASTRUCTURE =
  marketInfrastructureFromPublicEnvironment();

/**
 * Read-only market access for the application shell.
 *
 * The administrative MarketService also owns taxonomy eligibility mutations,
 * which loads the complete publication taxonomy. The shell only needs the
 * persisted market projection, so keeping these reads local prevents that
 * multi-hundred-kilobyte domain bundle from becoming hydration JavaScript on
 * every route.
 */
const listRuntimeMarkets = (): Market[] => {
  const markets = storageService.getMarkets();
  return markets.length > 0 ? markets : INITIAL_MARKETS;
};

const findRuntimeMarket = (code?: string): Market | undefined => {
  if (!code) return undefined;
  const normalized = code.toUpperCase();
  return listRuntimeMarkets().find(
    (market) => market.code.toUpperCase() === normalized,
  );
};

const getRuntimeMarket = (code?: string): Market => {
  const market = findRuntimeMarket(code || INITIAL_DEFAULT_MARKET.code);
  if (!market) throw new Error(`Unsupported market [${code}].`);
  return market;
};

const getRuntimeMarketConfig = (code?: string): MarketConfiguration => {
  const resolved = marketResolver.resolveEffectiveConfig(
    getRuntimeMarket(code),
    INITIAL_DEFAULT_MARKET,
  );
  return {
    ...resolved,
    search: {
      ...resolved.search,
      priceFilterStopsMajor: normalizePriceFilterStops(
        resolved.search?.priceFilterStopsMajor,
      ),
    },
  };
};

export interface LocationModalOptions {
  initialLocation?: LocationSelection;
  onApply?: (location: LocationSelection) => void;
}

interface MarketChangeTarget {
  code: string;
  name: string;
}

interface MarketContextType {
  marketContext: MarketContext | null;
  activeMarket: Market;
  effectiveConfig: MarketConfiguration;
  availableMarkets: Market[];
  selectableCountries: PublicCountryConfig[];
  setMarket: (marketCode: string) => void;
  manualMarketSelection: string | null;
  resetManualMarketSelection: () => void;
  marketRecommendation: MarketDetectionRecommendation | null;
  isDetectingMarket: boolean;
  marketDetectionIssue: "unknown" | "unavailable" | "error" | null;
  retryMarketDetection: () => void;
  acceptMarketRecommendation: () => void;
  dismissMarketRecommendation: () => void;
  requestPreciseLocation: () => Promise<ResolvedCurrentLocation>;
  pendingMarketChange: MarketChangeTarget | null;
  isChangingMarket: boolean;
  marketChangeFailed: boolean;
  confirmMarketChange: () => void;
  cancelMarketChange: () => void;
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
  locationModalOptions?: LocationModalOptions;
  openLocationModal: (options?: LocationModalOptions) => void;
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
  const { currentUser, isAuthenticated, isRestoring } = useAuth();
  const preferenceAccountId = currentUser?.id ?? null;
  const preferenceSubject = currentUser ? `account:${currentUser.id}` : "guest";
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
  const [restoredPreferenceSubject, setRestoredPreferenceSubject] = useState<
    string | null
  >(null);
  const hasRestoredPreferences =
    !isRestoring && restoredPreferenceSubject === preferenceSubject;
  const [manualMarketSelection, setManualMarketSelection] = useState<
    string | null
  >(null);
  const [marketRecommendation, setMarketRecommendation] =
    useState<MarketDetectionRecommendation | null>(null);
  const [isDetectingMarket, setIsDetectingMarket] = useState(false);
  const [marketDetectionIssue, setMarketDetectionIssue] = useState<
    "unknown" | "unavailable" | "error" | null
  >(null);
  const [pendingMarketChange, setPendingMarketChange] =
    useState<MarketChangeTarget | null>(null);
  const [isChangingMarket, setIsChangingMarket] = useState(false);
  const [marketChangeFailed, setMarketChangeFailed] = useState(false);
  const automaticDetectionScope = useRef<string | null>(null);
  const detectionRequestId = useRef(0);

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
    return getRuntimeMarket(activeMarketCode);
  }, [
    activeMarketCode,
    hasRestoredPreferences,
    marketDataVersion,
    requestMarket,
  ]);

  const effectiveConfig = useMemo<MarketConfiguration>(() => {
    if (!hasRestoredPreferences) return requestConfig;
    return getRuntimeMarketConfig(activeMarket.code);
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
    const markets = hasRestoredPreferences
      ? listRuntimeMarkets()
      : INITIAL_MARKETS;
    return listPublicCountries().flatMap((country) => {
      const market = markets.find((entry) => entry.code === country.code);
      return market ? [market] : [];
    });
  }, [hasRestoredPreferences, marketDataVersion]);
  const selectableCountries = useMemo(() => listPublicCountries(), []);

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
  const [locationModalOptions, setLocationModalOptions] = useState<
    LocationModalOptions | undefined
  >();
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);

  useEffect(() => {
    if (isRestoring) return;
    detectionRequestId.current += 1;
    setIsDetectingMarket(false);
    const storedMarketCode = storageService.getActiveMarketCode();
    const transferredManualMarket = consumeManualMarketSelectionHandoff(
      initialMarketContext?.countryCode,
      preferenceAccountId,
    );
    const storedManualMarket =
      transferredManualMarket ||
      marketSelectionPreferenceRepository.getManualCountry(preferenceAccountId);
    const resolvedMarketCode = resolveInitialMarketSelection({
      manualCountryCode: storedManualMarket,
      requestCountryCode: initialMarketContext?.countryCode,
      defaultCountryCode: INITIAL_DEFAULT_MARKET.code,
    });
    const restoredMarket = getRuntimeMarket(resolvedMarketCode);
    const restoredConfig = getRuntimeMarketConfig(restoredMarket.code);
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
    setManualMarketSelection(storedManualMarket);
    setMarketRecommendation(null);
    setMarketDetectionIssue(null);
    setRestoredPreferenceSubject(preferenceSubject);
  }, [
    initialMarketContext,
    isRestoring,
    preferenceAccountId,
    preferenceSubject,
  ]);

  const openLocationModal = useCallback(
    (options: LocationModalOptions = {}) => {
      setLocationModalOptions(options);
      setIsLocationModalOpen(true);
    },
    [],
  );

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
      void Promise.all([
        import("../../domains/taxonomy/taxonomy.service"),
        import("../../domains/taxonomy/taxonomy.data"),
      ]).then(([{ taxonomyService }, { refreshTaxonomyProjection }]) => {
        taxonomyService.reload();
        refreshTaxonomyProjection(shippedLocale);
      });
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

  const applyMarketChange = useCallback(
    (market: MarketChangeTarget) => {
      marketSelectionPreferenceRepository.saveManualCountry(
        market.code,
        preferenceAccountId,
      );
      marketSelectionPreferenceRepository.clearDeclinedRecommendation(
        preferenceAccountId,
        activeMarket.code,
      );
      setManualMarketSelection(market.code);
      setMarketRecommendation(null);
      setMarketDetectionIssue(null);
      setMarketChangeFailed(false);
      if (initialMarketContext && typeof window !== "undefined") {
        const directDestination = new URL(
          buildRuntimeMarketUrl({
            targetCountry: market.code,
            context: initialMarketContext,
            infrastructure: RUNTIME_MARKET_INFRASTRUCTURE,
          }),
          window.location.origin,
        );
        directDestination.searchParams.set(
          MANUAL_MARKET_SELECTION_QUERY,
          market.code,
        );
        const sourceCountry = getCountryConfig(
          initialMarketContext.countryCode || "",
        );
        const targetCountry = getCountryConfig(market.code);
        const canHandoff = shouldUseAuthenticatedMarketHandoff({
          isAuthenticated,
          currentOrigin: window.location.origin,
          currentHostname: window.location.hostname,
          destination: directDestination.toString(),
        });

        setIsChangingMarket(true);
        if (canHandoff) {
          if (!sourceCountry || !targetCountry) {
            setIsChangingMarket(false);
            setMarketChangeFailed(true);
            return;
          }
          void services.auth
            .beginDomainHandoff({
              sourceCountry: sourceCountry.code,
              targetCountry: targetCountry.code,
              returnTo: `${currentRuntimeInternalPath(initialMarketContext)}${directDestination.search}`,
            })
            .then(({ authorizationUrl }) =>
              window.location.assign(authorizationUrl),
            )
            .catch(() => {
              setIsChangingMarket(false);
              setMarketChangeFailed(true);
            });
          return;
        }
        window.location.assign(directDestination.toString());
        return;
      }

      const runtimeMarket = findRuntimeMarket(market.code);
      if (!runtimeMarket) return;
      setActiveMarketCode(runtimeMarket.code);
      storageService.saveActiveMarketCode(runtimeMarket.code);
      setPendingMarketChange(null);
      setIsChangingMarket(false);
      const defaultLoc: LocationSelection = {
        city: `Toute la ${runtimeMarket.name}`,
        postalCode: "",
        radiusKm: 0,
        label: `Toute la ${runtimeMarket.name}`,
      };
      setLocationState(defaultLoc);
      storageService.saveLocationPreference(defaultLoc);
    },
    [
      activeMarket.code,
      initialMarketContext,
      isAuthenticated,
      preferenceAccountId,
    ],
  );

  const requestMarketChange = useCallback(
    (market: MarketChangeTarget) => {
      if (market.code === activeMarket.code) {
        marketSelectionPreferenceRepository.saveManualCountry(
          market.code,
          preferenceAccountId,
        );
        marketSelectionPreferenceRepository.clearDeclinedRecommendation(
          preferenceAccountId,
          activeMarket.code,
        );
        setManualMarketSelection(market.code);
        setMarketRecommendation(null);
        setMarketDetectionIssue(null);
        return;
      }
      if (initialMarketContext && typeof window !== "undefined") {
        const destination = buildRuntimeMarketUrl({
          targetCountry: market.code,
          context: initialMarketContext,
          infrastructure: RUNTIME_MARKET_INFRASTRUCTURE,
        });
        const crossesDomain = crossesProductionMarketOrigin({
          currentOrigin: window.location.origin,
          currentHostname: window.location.hostname,
          destination,
        });
        if (crossesDomain) {
          setPendingMarketChange(market);
          setMarketChangeFailed(false);
          return;
        }
      }
      applyMarketChange(market);
    },
    [
      activeMarket.code,
      applyMarketChange,
      initialMarketContext,
      preferenceAccountId,
    ],
  );

  const setMarket = useCallback(
    (newMarketCode: string) => {
      const market = findRuntimeMarket(newMarketCode);
      if (market) {
        requestMarketChange(market);
        return;
      }
      const country = selectableCountries.find(
        (entry) => entry.code === newMarketCode.toUpperCase(),
      );
      if (country) {
        requestMarketChange({ code: country.code, name: country.name });
      }
    },
    [requestMarketChange, selectableCountries],
  );

  const confirmMarketChange = useCallback(() => {
    if (pendingMarketChange) applyMarketChange(pendingMarketChange);
  }, [applyMarketChange, pendingMarketChange]);

  const cancelMarketChange = useCallback(() => {
    if (isChangingMarket) return;
    setPendingMarketChange(null);
    setMarketChangeFailed(false);
  }, [isChangingMarket]);

  const detectProbableMarket = useCallback(
    async (force = false) => {
      if (manualMarketSelection && !force) return;
      const requestId = detectionRequestId.current + 1;
      detectionRequestId.current = requestId;
      setIsDetectingMarket(true);
      setMarketDetectionIssue(null);
      try {
        const recommendation =
          await marketDetectionController.detectProbableCountry();
        if (detectionRequestId.current !== requestId) return;
        const outcome = resolveMarketDetectionOutcome({
          recommendation,
          currentCountryCode: activeMarket.code,
          declinedCountryCode:
            marketSelectionPreferenceRepository.getDeclinedRecommendation(
              preferenceAccountId,
              activeMarket.code,
            ),
        });
        if (outcome.kind === "recommendation") {
          setMarketRecommendation(outcome.recommendation);
        } else {
          setMarketRecommendation(null);
        }
        setMarketDetectionIssue(
          outcome.kind === "country_selection_required" ? outcome.reason : null,
        );
      } catch {
        if (detectionRequestId.current !== requestId) return;
        setMarketRecommendation(null);
        setMarketDetectionIssue("error");
      } finally {
        if (detectionRequestId.current === requestId) {
          setIsDetectingMarket(false);
        }
      }
    },
    [activeMarket.code, manualMarketSelection, preferenceAccountId],
  );

  useEffect(() => {
    if (!hasRestoredPreferences || manualMarketSelection) {
      return;
    }
    const scope = `${preferenceSubject}:${activeMarket.code}`;
    if (automaticDetectionScope.current === scope) return;
    automaticDetectionScope.current = scope;
    void detectProbableMarket();
  }, [
    activeMarket.code,
    detectProbableMarket,
    hasRestoredPreferences,
    manualMarketSelection,
    preferenceSubject,
  ]);

  const resetManualMarketSelection = useCallback(() => {
    marketSelectionPreferenceRepository.clearManualCountry(preferenceAccountId);
    marketSelectionPreferenceRepository.clearDeclinedRecommendation(
      preferenceAccountId,
      activeMarket.code,
    );
    setManualMarketSelection(null);
    automaticDetectionScope.current = `${preferenceSubject}:${activeMarket.code}`;
    void detectProbableMarket(true);
  }, [
    activeMarket.code,
    detectProbableMarket,
    preferenceAccountId,
    preferenceSubject,
  ]);

  const retryMarketDetection = useCallback(() => {
    void detectProbableMarket(true);
  }, [detectProbableMarket]);

  const acceptMarketRecommendation = useCallback(() => {
    const country = marketRecommendation?.country;
    if (!country) return;
    requestMarketChange({ code: country.code, name: country.name });
  }, [marketRecommendation, requestMarketChange]);

  const dismissMarketRecommendation = useCallback(() => {
    const code = marketRecommendation?.country?.code;
    if (code) {
      marketSelectionPreferenceRepository.declineRecommendation(
        code,
        preferenceAccountId,
        activeMarket.code,
      );
    }
    setMarketRecommendation(null);
    setMarketDetectionIssue(null);
  }, [activeMarket.code, marketRecommendation, preferenceAccountId]);

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

  const requestPreciseLocation = useCallback(async () => {
    const coordinates = await requestCurrentCoordinates();
    const recommendation =
      await marketDetectionController.detectCountryFromCoordinates(coordinates);
    const outcome = resolveMarketDetectionOutcome({
      recommendation,
      currentCountryCode: activeMarket.code,
    });
    if (outcome.kind === "recommendation") {
      setMarketRecommendation(outcome.recommendation);
      setMarketDetectionIssue(null);
      throw new CurrentLocationError("outside_market");
    }
    if (outcome.kind === "country_selection_required") {
      setMarketRecommendation(null);
      setMarketDetectionIssue(outcome.reason);
      throw new CurrentLocationError("unresolved");
    }
    return resolveNearestMarketCity(
      coordinates,
      activeMarket.code,
      popularCities,
    );
  }, [activeMarket.code, popularCities]);

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
        selectableCountries,
        setMarket,
        manualMarketSelection,
        resetManualMarketSelection,
        marketRecommendation,
        isDetectingMarket,
        marketDetectionIssue,
        retryMarketDetection,
        acceptMarketRecommendation,
        dismissMarketRecommendation,
        requestPreciseLocation,
        pendingMarketChange,
        isChangingMarket,
        marketChangeFailed,
        confirmMarketChange,
        cancelMarketChange,
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
        locationModalOptions,
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
