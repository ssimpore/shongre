import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  resolveMarketContext,
  type CountryConfig,
  type MarketContext as ResolvedMarketContext,
} from "@shongre/contracts";
import { mobileEnvironment } from "@/config/environment";
import {
  isSelectableMobileMarket,
  mobileMarketCountries,
  mobileMarketStore,
} from "./market.store";

interface MarketContextValue {
  activeMarket: CountryConfig;
  marketContext: ResolvedMarketContext;
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

  const marketContext = useMemo(() => {
    const infrastructure = {
      globalDomain: mobileEnvironment.urls.internationalApp.host,
      franceDomain: mobileEnvironment.urls.franceApp.host,
      canonicalProtocol:
        mobileEnvironment.urls.franceApp.protocol === "http:"
          ? "http"
          : "https",
    } as const;
    return resolveMarketContext({
      hostname: activeMarket.isDefault
        ? infrastructure.franceDomain
        : infrastructure.globalDomain,
      pathname: activeMarket.basePath,
      infrastructure,
      allowDevelopmentHosts: false,
    });
  }, [activeMarket]);

  const value = useMemo(
    () => ({
      activeMarket,
      marketContext,
      countries: mobileMarketCountries,
      selectMarket,
      isSelectable: isSelectableMobileMarket,
    }),
    [activeMarket, marketContext, selectMarket],
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
