import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { buildPublicUrl, listGatewayCountries } from "@shongre/contracts";
import {
  metadataForRoute,
  structuredDataForRoute,
} from "../../src/platform/seo/route-metadata";
import { resolveSeoPolicy } from "../../src/platform/seo/seo-policy";
import { resolveServerPublicRouteData } from "../../src/platform/seo/server-public-route-data";
import {
  marketInfrastructureFromEnvironment,
  resolveServerMarketContext,
} from "../../src/platform/market/server-market-context";
import { GlobalGatewayPage } from "../../src/features/global/GlobalGatewayPage";
import { MarketLaunchPage } from "../../src/features/global/MarketLaunchPage";
import { WebApplication } from "../WebApplication";
import { resolveServerApplicationContext } from "../../src/platform/applications/server-application-context";
import { DEMO_SOLUTIONS } from "../../src/api/adapters/demo/demo-solutions.data";
import { PUBLIC_SOLUTION_LIFECYCLES } from "../../src/domains/solutions/solutions.presentation";

interface PageProps {
  params: Promise<{ segments?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function normalizePathname(segments: string[]): string {
  const pathname = `/${segments.join("/")}`;
  return pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
}

function serializeQuery(
  query: Record<string, string | string[] | undefined>,
): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
    } else if (value !== undefined) {
      params.set(key, value);
    }
  });
  return params.toString();
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const [{ segments = [] }, query] = await Promise.all([params, searchParams]);
  const pathname = normalizePathname(segments);
  const applicationContext = await resolveServerApplicationContext(pathname);
  if (applicationContext) {
    const { applicationId, applicationPath, canonicalOrigin } =
      applicationContext;
    const rootCanonical = `${canonicalOrigin}/`;
    let title = "Shongre";
    let description = "Les applications professionnelles Shongre.";
    let canonical = rootCanonical;
    let noIndex = pathname !== "/";

    if (applicationId === "solutions") {
      const slug = applicationPath.split("/").filter(Boolean)[0];
      const candidate = slug
        ? DEMO_SOLUTIONS.find((value) => value.slug === slug)
        : null;
      const solution =
        candidate && PUBLIC_SOLUTION_LIFECYCLES.includes(candidate.lifecycle)
          ? candidate
          : null;
      const unknownSolution = Boolean(slug && !solution);
      title = unknownSolution
        ? "Solution introuvable — Shongre Solutions"
        : solution
          ? `${solution.name} — Shongre Solutions`
          : "Shongre Solutions — Toutes vos applications professionnelles";
      description = unknownSolution
        ? "Cette adresse ne correspond à aucune solution publique du catalogue Shongre."
        : solution?.description ||
          "Activez les solutions utiles à votre organisation et retrouvez chaque espace de travail avec un seul compte Shongre.";
      canonical = new URL(pathname, rootCanonical).toString();
      noIndex =
        unknownSolution ||
        Boolean(
          solution &&
          ["MAINTENANCE", "DEPRECATED"].includes(solution.lifecycle),
        );
    } else if (applicationId === "prospects") {
      title = "Shongre Prospects — Trouvez et qualifiez vos prospects B2B";
      description =
        "Transformez un profil cible en entreprises qualifiées avec score explicable, preuves sourcées et validation humaine.";
    } else {
      title = "Shongre Facturation — Facturez avec confiance";
      description =
        "Créez, finalisez et suivez vos factures au sein de votre organisation Shongre.";
    }

    return {
      title,
      description,
      alternates: { canonical },
      robots: noIndex
        ? { index: false, follow: false }
        : { index: true, follow: true },
      openGraph: {
        title,
        description,
        type: "website",
        locale: "fr_FR",
        siteName: "Shongre",
        url: canonical,
      },
    };
  }
  const context = await resolveServerMarketContext(pathname);
  if (context.kind === "global_gateway") {
    return {
      title: "Shongre — Choisissez votre pays",
      description:
        "Accédez au marché local Shongre de votre pays depuis la porte d’entrée internationale.",
      alternates: { canonical: context.canonicalUrl },
      openGraph: {
        title: "Shongre — Choisissez votre pays",
        description:
          "Annonces, services et professionnels Shongre dans votre pays.",
        type: "website",
        locale: "fr_FR",
        siteName: "Shongre",
        url: context.canonicalUrl,
      },
    };
  }
  if (context.kind === "coming_soon" && context.country) {
    return {
      title: context.country.launchContent.title,
      description: context.country.launchContent.description,
      alternates: { canonical: context.canonicalUrl },
      robots: context.country.seo.indexable
        ? { index: true, follow: true }
        : { index: false, follow: true },
      openGraph: {
        title: context.country.launchContent.title,
        description: context.country.launchContent.description,
        type: "website",
        locale: context.country.seo.hreflang.replace("-", "_"),
        siteName: "Shongre",
        url: context.canonicalUrl,
      },
    };
  }
  if (context.kind !== "market") notFound();
  const routeData = await resolveServerPublicRouteData(
    context.internalPath,
    context.countryCode!,
    serializeQuery(query),
  );
  const policy = resolveSeoPolicy({
    pathname: context.internalPath,
    query,
    marketContext: context,
    routeData,
  });
  // Resolve absence before the page starts streaming. Next can only change a
  // non-streamed response to 404; a late notFound() would otherwise produce a
  // soft 404 with a 200 status and only a noindex tag.
  if (routeData.status === "not_found" || !policy.knownRoute) notFound();
  return metadataForRoute({
    pathname: context.internalPath,
    query,
    marketContext: context,
    routeData,
  });
}

export default async function Page({ params, searchParams }: PageProps) {
  const [{ segments = [] }, query] = await Promise.all([params, searchParams]);
  const pathname = normalizePathname(segments);
  const queryString = serializeQuery(query);
  const applicationContext = await resolveServerApplicationContext(pathname);
  if (applicationContext) {
    return (
      <WebApplication
        pathname={pathname}
        marketContext={applicationContext.marketContext}
        applicationId={applicationContext.applicationId}
        routingBasePath={applicationContext.routingBasePath}
      />
    );
  }
  const context = await resolveServerMarketContext(pathname);
  const infrastructure = marketInfrastructureFromEnvironment();

  if (context.kind === "redirect" && context.redirectUrl) {
    permanentRedirect(context.redirectUrl);
  }
  if (context.kind === "invalid_host" || context.kind === "not_found") {
    notFound();
  }
  if (context.kind === "global_gateway") {
    const countries = listGatewayCountries().map((country) => ({
      country,
      href: buildPublicUrl({ country: country.code, infrastructure }),
    }));
    const indexableCountries = countries.filter(
      ({ country }) =>
        country.enabled &&
        country.marketplace.enabled &&
        country.seo.indexable &&
        country.compliance.legalReviewStatus === "approved" &&
        ["active", "beta"].includes(country.launchStatus),
    );
    const franceOrigin = buildPublicUrl({
      country: "FR",
      infrastructure,
    }).replace(/\/$/, "");
    const structuredData = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Shongre",
      url: context.canonicalUrl,
      potentialAction: indexableCountries.map(({ country, href }) => ({
        "@type": "ChooseAction",
        name: country.name,
        target: href,
      })),
    }).replace(/</g, "\\u003c");
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredData }}
        />
        <GlobalGatewayPage countries={countries} franceOrigin={franceOrigin} />
      </>
    );
  }
  if (context.kind === "coming_soon" && context.country) {
    return (
      <MarketLaunchPage
        country={context.country}
        gatewayHref={`${infrastructure.canonicalProtocol}://${infrastructure.globalDomain}/`}
      />
    );
  }
  if (context.kind !== "market") notFound();

  const routeData = await resolveServerPublicRouteData(
    context.internalPath,
    context.countryCode!,
    queryString,
  );
  const policy = resolveSeoPolicy({
    pathname: context.internalPath,
    query,
    marketContext: context,
    routeData,
  });
  if (routeData.status === "not_found" || !policy.knownRoute) notFound();
  if (policy.redirectPath) {
    const target = buildPublicUrl({
      country: context.countryCode!,
      route: policy.redirectPath,
      infrastructure: context.infrastructure,
    });
    permanentRedirect(queryString ? `${target}?${queryString}` : target);
  }

  const structuredData = structuredDataForRoute(policy, context, routeData);
  const initialPath = `${context.publicPath}${queryString ? `?${queryString}` : ""}`;

  return (
    <>
      {structuredData.map((entry, index) => (
        <script
          key={`${policy.resourceType}-${index}`}
          type="application/ld+json"
          data-seo-ld="server"
          dangerouslySetInnerHTML={{ __html: entry }}
        />
      ))}
      <WebApplication
        pathname={initialPath}
        marketContext={context}
        initialPublicRouteData={
          routeData.status === "found" ? routeData.data : null
        }
      />
    </>
  );
}
