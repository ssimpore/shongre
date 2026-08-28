import type { Metadata } from "next";
import {
  buildPublicUrl,
  COUNTRY_REGISTRY,
  type MarketContext,
} from "@shongre/contracts";
import { resolveOpenGraphLocale } from "../../services/seo.service";
import type { PublicRouteDataResolution } from "./public-route-data";
import {
  resolveSeoPolicy,
  serializeStructuredData,
  structuredDataForPolicy,
  type SeoRoutePolicy,
} from "./seo-policy";

export interface RouteMetadataInput {
  pathname: string;
  query?: Record<string, string | string[] | undefined>;
  marketContext: MarketContext;
  routeData?: PublicRouteDataResolution;
  now?: Date;
}

function languageAlternates(
  policy: SeoRoutePolicy,
  context: MarketContext,
): Record<string, string> {
  if (!policy.indexable) return {};
  const allowed = new Set(policy.alternateCountryCodes);
  const languages = Object.fromEntries(
    COUNTRY_REGISTRY.filter((country) => allowed.has(country.code)).map(
      (country) => [
        country.seo.hreflang,
        buildPublicUrl({
          country: country.code,
          route: policy.canonicalPath,
          infrastructure: context.infrastructure,
        }),
      ],
    ),
  );
  if (policy.includeXDefault) {
    languages["x-default"] =
      `${context.infrastructure.canonicalProtocol}://${context.infrastructure.globalDomain}/`;
  }
  return languages;
}

export function metadataForPolicy(
  policy: SeoRoutePolicy,
  marketContext: MarketContext,
): Metadata {
  const alternateLocales = policy.alternateCountryCodes
    .filter((code) => code !== marketContext.countryCode)
    .map((code) => COUNTRY_REGISTRY.find((country) => country.code === code))
    .filter((country) => Boolean(country))
    .map((country) => resolveOpenGraphLocale(country!.defaultLocale));
  const languages = languageAlternates(policy, marketContext);

  return {
    title: policy.title,
    description: policy.description,
    alternates: {
      canonical: policy.canonicalUrl,
      ...(Object.keys(languages).length ? { languages } : {}),
    },
    robots: {
      index: policy.indexable,
      follow: policy.follow,
    },
    openGraph: {
      title: policy.title,
      description: policy.description,
      type:
        policy.openGraphType === "profile"
          ? "profile"
          : policy.openGraphType === "article"
            ? "article"
            : "website",
      locale: resolveOpenGraphLocale(marketContext.locale || undefined),
      alternateLocale: alternateLocales,
      siteName: "Shongre",
      url: policy.canonicalUrl,
      ...(policy.image ? { images: [{ url: policy.image }] } : {}),
    },
    twitter: {
      card: policy.image ? "summary_large_image" : "summary",
      title: policy.title,
      description: policy.description,
      ...(policy.image ? { images: [policy.image] } : {}),
    },
  };
}

export function metadataForRoute(input: RouteMetadataInput): Metadata {
  return metadataForPolicy(resolveSeoPolicy(input), input.marketContext);
}

export function structuredDataForRoute(
  policy: SeoRoutePolicy,
  marketContext: MarketContext,
  routeData: PublicRouteDataResolution,
): string[] {
  return serializeStructuredData(
    structuredDataForPolicy(policy, marketContext, routeData),
  );
}
