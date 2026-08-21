import type { Metadata } from "next";
import {
  metadataForRoute,
  structuredDataForRoute,
} from "../../src/platform/seo/route-metadata";
import { WebApplication } from "../WebApplication";

interface PageProps {
  params: Promise<{ segments?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const ORIGIN = process.env.PRODUCTION_WEB_URL ?? "https://shongre.com";

function normalizePathname(segments: string[]): string {
  const pathname = `/${segments.join("/")}`;
  return pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const [{ segments = [] }, query] = await Promise.all([params, searchParams]);
  return metadataForRoute({
    pathname: normalizePathname(segments),
    query,
    origin: ORIGIN,
  });
}

export default async function Page({ params }: PageProps) {
  const { segments = [] } = await params;
  /* Rendered on the server so a crawler sees the Product/ProfilePage schema in
     the initial HTML. The SPA emits the same shape after hydration, which is
     too late for anything that never runs the bundle. */
  const structuredData = structuredDataForRoute(
    normalizePathname(segments),
    ORIGIN,
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
      <WebApplication />
    </>
  );
}
