import { useMemo } from "react";
import { useMarketLocation } from "../app/providers/MarketLocationProvider";
import {
  pageMetaForPolicy,
  resolveSeoPolicy,
  structuredDataForPolicy,
} from "../platform/seo/seo-policy";
import { usePageMeta } from "./usePageMeta";

/** Keeps client navigation metadata identical to the App Router SEO policy. */
export function useStaticPageSeo(canonicalPath: string): void {
  const { marketContext } = useMarketLocation();
  const metadata = useMemo(() => {
    if (!marketContext) return { noIndex: true, follow: true };
    const routeData = { status: "not_applicable", data: null } as const;
    const policy = resolveSeoPolicy({
      pathname: canonicalPath,
      marketContext,
      routeData,
    });
    return pageMetaForPolicy(
      policy,
      structuredDataForPolicy(policy, marketContext, routeData),
    );
  }, [canonicalPath, marketContext]);
  usePageMeta(metadata);
}
