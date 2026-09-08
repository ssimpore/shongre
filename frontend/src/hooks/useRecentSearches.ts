import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../app/providers/AuthProvider";
import { useMarketLocation } from "../app/providers/MarketLocationProvider";
import {
  browserPreferencesService,
  RECENT_SEARCHES_CHANGED_EVENT,
} from "../services/browser-preferences.service";

const EMPTY_SEARCHES: string[] = [];

/** Browser-local UX history, never a source of marketplace inventory or identity. */
export function useRecentSearches() {
  const { currentUser, isRestoring } = useAuth();
  const { activeMarket } = useMarketLocation();
  const subject = currentUser?.id;
  const marketCode = activeMarket.code;
  const scope = browserPreferencesService.recentSearchesKey(
    subject,
    marketCode,
  );
  const [snapshot, setSnapshot] = useState<{
    scope: string;
    searches: string[];
  } | null>(null);

  useEffect(() => {
    if (isRestoring) return;
    const reload = () =>
      setSnapshot({
        scope,
        searches: browserPreferencesService.getRecentSearches(
          subject,
          marketCode,
        ),
      });
    const onChange = (event: Event) => {
      if ((event as CustomEvent<string>).detail === scope) reload();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === scope) reload();
    };
    reload();
    window.addEventListener(RECENT_SEARCHES_CHANGED_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(RECENT_SEARCHES_CHANGED_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [isRestoring, marketCode, scope, subject]);

  const rememberSearch = useCallback(
    (query: string) => {
      if (!isRestoring)
        browserPreferencesService.addRecentSearch(query, subject, marketCode);
    },
    [isRestoring, marketCode, subject],
  );
  const removeSearch = useCallback(
    (query: string) => {
      if (!isRestoring)
        browserPreferencesService.removeRecentSearch(
          query,
          subject,
          marketCode,
        );
    },
    [isRestoring, marketCode, subject],
  );
  const clearSearches = useCallback(() => {
    if (!isRestoring)
      browserPreferencesService.clearRecentSearches(subject, marketCode);
  }, [isRestoring, marketCode, subject]);

  return {
    recentSearches:
      !isRestoring && snapshot?.scope === scope
        ? snapshot.searches
        : EMPTY_SEARCHES,
    rememberSearch,
    removeSearch,
    clearSearches,
  };
}
