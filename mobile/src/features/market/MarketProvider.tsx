import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { CountryConfig } from "@shongre/contracts";
import {
  isSelectableMobileMarket,
  mobileMarketCountries,
  mobileMarketStore,
} from "./market.store";

interface MarketContextValue {
  activeMarket: CountryConfig;
  countries: readonly CountryConfig[];
  selectMarket(code: string): Promise<void>;
  isSelectable(country: CountryConfig): boolean;
}

const MarketContext = createContext<MarketContextValue | null>(null);

export function MarketProvider({ children }: PropsWithChildren) {
  const [activeMarket, setActiveMarket] = useState(() =>
    mobileMarketStore.getActive(),
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void mobileMarketStore.restore().then((market) => {
      if (active) {
        setActiveMarket(market);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const selectMarket = useCallback(async (code: string) => {
    setActiveMarket(await mobileMarketStore.select(code));
  }, []);

  const value = useMemo(
    () => ({
      activeMarket,
      countries: mobileMarketCountries,
      selectMarket,
      isSelectable: isSelectableMobileMarket,
    }),
    [activeMarket, selectMarket],
  );

  return (
    <MarketContext.Provider value={value}>
      {ready ? children : null}
    </MarketContext.Provider>
  );
}

export function useMarket(): MarketContextValue {
  const value = useContext(MarketContext);
  if (!value) throw new Error("useMarket must be used within MarketProvider.");
  return value;
}
