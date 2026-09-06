import { isStaffSeparatedSubject } from "@shongre/contracts/access-control";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { services } from "../../api/client/service-registry";
import type { UserWorkspaceSummary } from "../../api/contracts/workspace.contract";
import { useAuth } from "./AuthProvider";
import { useMarketLocation } from "./MarketLocationProvider";

interface WorkspaceSummaryContextValue {
  summary: UserWorkspaceSummary | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const WorkspaceSummaryContext = createContext<
  WorkspaceSummaryContextValue | undefined
>(undefined);

export const WorkspaceSummaryProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { currentUser, isRestoring } = useAuth();
  const { activeMarket } = useMarketLocation();
  const currentUserId = currentUser?.id ?? null;
  const isStaffIdentity = isStaffSeparatedSubject(currentUser);
  const [summary, setSummary] = useState<UserWorkspaceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (isRestoring) return;
    if (!currentUserId || isStaffIdentity) {
      setSummary(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      setSummary(
        await services.workspace.getUserWorkspaceSummary(
          currentUserId,
          activeMarket.code,
        ),
      );
    } catch {
      // A secondary account badge must not break authenticated navigation.
      // Explicit workspace pages retain their own retry/error surfaces.
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeMarket.code, currentUserId, isRestoring, isStaffIdentity]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ summary, isLoading, refresh }),
    [isLoading, refresh, summary],
  );

  return (
    <WorkspaceSummaryContext.Provider value={value}>
      {children}
    </WorkspaceSummaryContext.Provider>
  );
};

export function useWorkspaceSummary(): WorkspaceSummaryContextValue {
  const context = useContext(WorkspaceSummaryContext);
  if (!context) {
    throw new Error(
      "useWorkspaceSummary must be used within a WorkspaceSummaryProvider",
    );
  }
  return context;
}
