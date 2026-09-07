import { createContext, useContext } from "react";
import type { UserWorkspaceSummary } from "../../api/contracts/workspace.contract";

export interface WorkspaceSummaryContextValue {
  summary: UserWorkspaceSummary | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export const WorkspaceSummaryContext =
  createContext<WorkspaceSummaryContextValue>({
    summary: null,
    isLoading: false,
    refresh: async () => {},
  });

export function useWorkspaceSummary(): WorkspaceSummaryContextValue {
  return useContext(WorkspaceSummaryContext);
}
