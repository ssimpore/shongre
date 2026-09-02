import React from "react";
import type { HomepageSectionView } from "../../../domains/homepage/homepage.types";
import { HomeCollectionExplorer } from "./HomeCollectionExplorer";
import { HomeDiscoveryTabsSection } from "./HomeDiscoveryTabsSection";
import { HomeProCtaSection } from "./HomeProCtaSection";

export const HomeBelowFold: React.FC<{
  sections: HomepageSectionView[];
  onRetry: () => void;
}> = ({ sections, onRetry }) => {
  const collection = sections.find((section) => section.type === "collections");
  const professional = sections.find((section) => section.type === "pro_cta");

  return (
    <div className="space-y-8 sm:space-y-12">
      <HomeDiscoveryTabsSection sections={sections} onRetry={onRetry} />
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
