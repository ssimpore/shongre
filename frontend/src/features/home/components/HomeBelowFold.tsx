import React from "react";
import type { HomepageSectionView } from "../../../domains/homepage/homepage.types";
import { HomeCollectionExplorer } from "./HomeCollectionExplorer";
import { HomeDiscoverySections } from "./HomeDiscoverySections";
import { HomeProCtaSection } from "./HomeProCtaSection";
import { HomeRecentSearches } from "./HomeRecentSearches";
import { HomeUniverseExplorer } from "./HomeUniverseExplorer";

export const HomeBelowFold: React.FC<{
  sections: HomepageSectionView[];
  onRetry: () => void;
}> = ({ sections, onRetry }) => {
  return (
    <>
      {sections.flatMap((section) => {
        if (section.type === "recent_searches") {
          return [<HomeRecentSearches key={section.key} section={section} />];
        }
        if (
          section.type === "trending" ||
          section.type === "deals" ||
          section.type === "recent_listings"
        ) {
          return [
            <HomeDiscoverySections
              key={section.key}
              sections={[section]}
              onRetry={onRetry}
            />,
          ];
        }
        if (section.type === "universe_explorer") {
          return [
            <HomeUniverseExplorer
              key={section.key}
              section={section}
              onRetry={onRetry}
            />,
          ];
        }
        if (section.type === "collections") {
          return [
            <HomeCollectionExplorer key={section.key} section={section} />,
          ];
        }
        if (section.type === "pro_cta") {
          return [<HomeProCtaSection key={section.key} section={section} />];
        }
        return [];
      })}
    </>
  );
};
