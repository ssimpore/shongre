import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { buildPublicUrl, listGatewayCountries } from "@shongre/contracts";
import {
  metadataForRoute,
  structuredDataForRoute,
} from "../../src/platform/seo/route-metadata";
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

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const [{ segments = [] }, query] = await Promise.all([params, searchParams]);
  const pathname = normalizePathname(segments);
  const applicationContext = await resolveServerApplicationContext();
  if (applicationContext) {
    const { applicationId, canonicalOrigin } = applicationContext;
    const rootCanonical = `${canonicalOrigin}/`;
    let title = "Shongre";
    let description = "Les applications professionnelles Shongre.";
    let canonical = rootCanonical;
    let noIndex = pathname !== "/";

    if (applicationId === "solutions") {
      const slug = pathname.split("/").filter(Boolean)[0];
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
      noIndex = unknownSolution || Boolean(
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
  if (context.kind !== "market") return {};
  return metadataForRoute({
    pathname: context.internalPath,
    query,
    marketContext: context,
  });
}

export default async function Page({ params }: PageProps) {
  const { segments = [] } = await params;
  const pathname = normalizePathname(segments);
  const applicationContext = await resolveServerApplicationContext();
  if (applicationContext) {
    return (
      <WebApplication
        pathname={pathname}
        marketContext={applicationContext.marketContext}
        applicationId={applicationContext.applicationId}
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
    const franceOrigin = buildPublicUrl({
      country: "FR",
      infrastructure,
    }).replace(/\/$/, "");
    const structuredData = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Shongre",
      url: context.canonicalUrl,
      potentialAction: countries.map(({ country, href }) => ({
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

  /* Rendered on the server so a crawler sees the Product/ProfilePage schema in
     the initial HTML. The SPA emits the same shape after hydration, which is
     too late for anything that never runs the bundle. */
  const structuredData = structuredDataForRoute(context.internalPath, context);

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          // Serialised ahead of time; `<` is escaped so the payload can never
          // close the script element early.
          dangerouslySetInnerHTML={{ __html: structuredData }}
        />
      )}
      <WebApplication pathname={context.publicPath} marketContext={context} />
    </>
  );
}
