import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { LocationSelection } from '../../types';
import { Market, MarketConfiguration, MarketCity } from '../../domains/market/market.types';
import { marketService } from '../../domains/market/market.service';
import { storageService } from '../../services/storage.service';
import { formatPrice as formatPriceUtil } from '../../utilities/formatters';

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
  formatPrice: (amount: number, options?: { showCurrency?: boolean; isFreeDonation?: boolean }) => string;
  isLocationModalOpen: boolean;
  openLocationModal: () => void;
  closeLocationModal: () => void;
  isPreferencesModalOpen: boolean;
  openPreferencesModal: () => void;
  closePreferencesModal: () => void;
}

const MarketLocationContext = createContext<MarketContextType | undefined>(undefined);

export const MarketLocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeMarketCode, setActiveMarketCode] = useState<string>(() =>
    storageService.getActiveMarketCode() || 'FR'
  );

  const activeMarket = useMemo<Market>(() => {
    return marketService.getMarket(activeMarketCode);
  }, [activeMarketCode]);

  const effectiveConfig = useMemo<MarketConfiguration>(() => {
    return marketService.getEffectiveConfig(activeMarket.code);
  }, [activeMarket]);

  const availableMarkets = useMemo<Market[]>(() => {
    return marketService.getMarkets().filter((m) => m.status === 'active' || m.status === 'coming_soon');
  }, []);

  const [location, setLocationState] = useState<LocationSelection>(() => {
    const saved = storageService.getLocationPreference();
    if (saved && saved.city) {
      return saved;
    }
    return {
      city: `Toute la ${activeMarket.name}`,
      postalCode: '',
      radiusKm: 0,
      label: `Toute la ${activeMarket.name}`,
    };
  });

  const [currentLocale, setCurrentLocaleState] = useState<string>(() => {
    return storageService.getUserLocale() || effectiveConfig.localization.defaultLocale;
  });

  const [currentCurrency, setCurrentCurrencyState] = useState<string>(() => {
    return storageService.getUserCurrency() || effectiveConfig.localization.defaultCurrency;
  });

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);

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
    const userLocale = storageService.getUserLocale();
    if (!userLocale) {
      setCurrentLocaleState(effectiveConfig.localization.defaultLocale);
    }
    const userCurr = storageService.getUserCurrency();
    if (!userCurr) {
      setCurrentCurrencyState(effectiveConfig.localization.defaultCurrency);
    }
  }, [effectiveConfig]);

  const setLocale = useCallback((locale: string) => {
    setCurrentLocaleState(locale);
    storageService.saveUserLocale(locale);
  }, []);

  // Keep the document language in sync with the active locale. Screen readers
  // pick pronunciation from `<html lang>`, and it was pinned to the `fr` in
  // index.html no matter what the user selected.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = currentLocale.slice(0, 2);
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
      postalCode: '',
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
      postalCode: '',
      radiusKm: 0,
      label: `Toute la ${activeMarket.name}`,
    };
    setLocation(defaultLoc);
  }, [activeMarket, setLocation]);

  const popularCities = useMemo<MarketCity[]>(() => {
    return activeMarket.geography?.popularCities || [];
  }, [activeMarket]);

  const currencySymbol = useMemo<string>(() => {
    if (currentCurrency === 'EUR') return '€';
    if (currentCurrency === 'USD') return '$';
    if (currentCurrency === 'GBP') return '£';
    if (currentCurrency === 'CHF') return 'CHF';
    return currentCurrency;
  }, [currentCurrency]);

  const formatPrice = useCallback(
    (amount: number, options?: { showCurrency?: boolean; isFreeDonation?: boolean }) => {
      return formatPriceUtil(amount, {
        ...options,
        locale: currentLocale,
        currency: currentCurrency,
      });
    },
    [currentLocale, currentCurrency]
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
  if (!ctx) throw new Error('useMarketLocation must be used within MarketLocationProvider');
  return ctx;
}

export function useMarket(): MarketContextType {
  return useMarketLocation();
}

export function useMarketConfig(): MarketConfiguration {
  const { effectiveConfig } = useMarketLocation();
  return effectiveConfig;
}
