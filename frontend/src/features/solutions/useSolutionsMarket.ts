import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";

/** Search param carrying the catalogue market. */
export const SOLUTIONS_MARKET_PARAM = "marche";

/**
 * The single source of truth for which market the Solutions surface is showing.
 *
 * The shell and the catalogue each used to keep their own copy — the header read
 * `activeMarket.code` while the page held local state seeded from it and never
 * written back — so switching market emptied the catalogue while the header
 * dropdown above it kept listing every solution. Putting the choice in the URL
 * gives both components the same cell to read, and as a side effect makes a
 * filtered catalogue linkable and survives a reload.
 *
 * An unknown or malformed code falls back to the active market rather than
 * querying for a market that does not exist.
 */
export function useSolutionsMarket(): {
  marketCode: string;
  setMarketCode: (code: string) => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeMarket, availableMarkets } = useMarketLocation();

  const requested = searchParams.get(SOLUTIONS_MARKET_PARAM)?.toUpperCase();
  const isKnown =
    !!requested && availableMarkets.some((market) => market.code === requested);
  const marketCode = isKnown ? requested : activeMarket.code;

  const setMarketCode = useCallback(
    (code: string) => {
      setSearchParams(
        (params) => {
          const next = new URLSearchParams(params);
          // The home market is the default, so it stays out of the URL and the
          // canonical address of the catalogue keeps no redundant query.
          if (code === activeMarket.code) {
            next.delete(SOLUTIONS_MARKET_PARAM);
          } else {
            next.set(SOLUTIONS_MARKET_PARAM, code);
          }
          return next;
        },
        // A push rather than a replace: changing market is a navigation the
        // reader should be able to undo with the back button.
        { replace: false },
      );
    },
    [activeMarket.code, setSearchParams],
  );

  return { marketCode, setMarketCode };
}
