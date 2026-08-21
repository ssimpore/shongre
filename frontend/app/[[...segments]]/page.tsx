import type { Metadata } from "next";
import { metadataForRoute } from "../../src/platform/seo/route-metadata";
import { WebApplication } from "../WebApplication";

interface PageProps {
  params: Promise<{ segments?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const [{ segments = [] }, query] = await Promise.all([params, searchParams]);
  const pathname = `/${segments.join("/")}`;
  return metadataForRoute({
    pathname: pathname === "/" ? "/" : pathname.replace(/\/+$/, ""),
    query,
    origin: process.env.PRODUCTION_WEB_URL ?? "https://shongre.com",
  });
}

export default function Page() {
  return <WebApplication />;
}
