import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  buildPublicUrl,
  listGatewayCountries,
} from "@shongre/contracts";
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
  const structuredData = structuredDataForRoute(
    context.internalPath,
    context,
  );

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
