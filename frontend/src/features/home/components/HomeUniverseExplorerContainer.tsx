import React from "react";
import { useHomeUniverseListings } from "../useHomeUniverseListings";
import { HomeUniverseExplorerContent } from "./HomeUniverseExplorer";

export const HomeUniverseExplorer: React.FC<{ marketCode: string }> = ({
  marketCode,
}) => {
  const { groups, retry } = useHomeUniverseListings(marketCode);
  return <HomeUniverseExplorerContent groups={groups} onRetry={retry} />;
};
