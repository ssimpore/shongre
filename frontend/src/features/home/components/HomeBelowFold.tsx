import React from "react";
import type { HomepageSectionView } from "../../../domains/homepage/homepage.types";
import { HomeCollectionExplorer } from "./HomeCollectionExplorer";
import { HomeDiscoverySections } from "./HomeDiscoverySections";
import { HomeProCtaSection } from "./HomeProCtaSection";
import { HomeUniverseExplorer } from "./HomeUniverseExplorerContainer";

export const HomeBelowFold: React.FC<{
  sections: HomepageSectionView[];
  marketCode: string;
  onRetry: () => void;
}> = ({ sections, marketCode, onRetry }) => {
  const collection = sections.find((section) => section.type === "collections");
  const professional = sections.find((section) => section.type === "pro_cta");

  return (
    <div className="space-y-8 sm:space-y-12">
      <HomeDiscoverySections sections={sections} onRetry={onRetry} />
      <HomeUniverseExplorer marketCode={marketCode} />
      {collection ? (
        <HomeCollectionExplorer
          title={collection.title}
          subtitle={collection.subtitle}
          maxItems={collection.maxItems}
        />
      ) : null}
      {professional ? <HomeProCtaSection section={professional} /> : null}
    </div>
  );
};
