import type { MarketContext } from "@shongre/contracts";
import { brand } from "@shongre/brand";
import { webBrandAssets } from "@shongre/brand/web";
import type { StructuredData } from "../../services/seo.service";

export const DISCOVERY_PUBLIC_PATHS = Object.freeze({
  about: "/a-propos",
  accessibility: "/accessibilite",
  categories: "/categories",
  contact: "/contact",
  help: "/aide",
  legal: "/mentions-legales",
  privacy: "/confidentialite",
  professionals: "/professionnels",
  safety: "/securite",
  terms: "/conditions-utilisation",
});

const STATIC_PAGE_SCHEMA_TYPES: Readonly<Record<string, string>> =
  Object.freeze({
    [DISCOVERY_PUBLIC_PATHS.about]: "AboutPage",
    [DISCOVERY_PUBLIC_PATHS.contact]: "ContactPage",
    [DISCOVERY_PUBLIC_PATHS.help]: "WebPage",
    [DISCOVERY_PUBLIC_PATHS.legal]: "WebPage",
    [DISCOVERY_PUBLIC_PATHS.privacy]: "WebPage",
    [DISCOVERY_PUBLIC_PATHS.safety]: "WebPage",
    [DISCOVERY_PUBLIC_PATHS.terms]: "WebPage",
    [DISCOVERY_PUBLIC_PATHS.accessibility]: "WebPage",
  });

export function normalizePublicSocialProfiles(
  values: readonly string[],
): string[] {
  return Array.from(
    new Set(
      values.flatMap((value) => {
        try {
          const url = new URL(value);
          return url.protocol === "https:" && !url.username && !url.password
            ? [url.toString()]
            : [];
        } catch {
          return [];
        }
      }),
    ),
  ).sort();
}

export function socialProfilesFromExternalLinks(links: {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  youtube?: string;
}): string[] {
  return normalizePublicSocialProfiles([
    links.instagram ?? "",
    links.facebook ?? "",
    links.linkedin ?? "",
    links.youtube ?? "",
  ]);
}

export function organizationStructuredData(input: {
  context: MarketContext;
  canonicalUrl: string;
  socialProfiles?: readonly string[];
}): StructuredData[] {
  const { context } = input;
  const protocol = context.infrastructure.canonicalProtocol;
  const globalOrigin = `${protocol}://${context.infrastructure.globalDomain}`;
  const siteOrigin = new URL(input.canonicalUrl).origin;
  const organizationId = `${globalOrigin}/#organization`;
  const socialProfiles = normalizePublicSocialProfiles(
    input.socialProfiles ?? [],
  );

  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": organizationId,
      name: brand.name,
      description:
        "Place de marché locale pour particuliers et professionnels, avec annonces, paiement, livraison et services de confiance.",
      url: `${globalOrigin}/`,
      logo: new URL(
        webBrandAssets.icon.structuredData.src,
        globalOrigin,
      ).toString(),
      ...(socialProfiles.length ? { sameAs: socialProfiles } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteOrigin}/#website`,
      name: brand.name,
      url: `${siteOrigin}/`,
      inLanguage: context.locale || undefined,
      publisher: { "@id": organizationId },
    },
  ];
}

export function staticPageStructuredData(input: {
  canonicalPath: string;
  canonicalUrl: string;
  title: string;
  description: string;
  locale?: string;
}): StructuredData | null {
  const pageType = staticPageSchemaType(input.canonicalPath);
  if (!pageType) return null;
  return {
    "@context": "https://schema.org",
    "@type": pageType,
    name: input.title.replace(/\s*[|—].*$/, ""),
    description: input.description,
    url: input.canonicalUrl,
    inLanguage: input.locale || undefined,
  };
}

export function staticPageSchemaType(pathname: string): string | undefined {
  return STATIC_PAGE_SCHEMA_TYPES[pathname];
}
