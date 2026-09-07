import { isProduction } from "@shongre/contracts/environment";
import { resolveServerMarketContext } from "../../src/platform/market/server-market-context";
import { webEnvironmentFromEnvironment } from "../../src/platform/market/market-infrastructure";
import { validIndexNowKey } from "../../src/platform/seo/discovery-governance";

export const dynamic = "force-dynamic";

function notFound(): Response {
  return new Response("Not found", {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

export async function GET(): Promise<Response> {
  if (
    !isProduction(webEnvironmentFromEnvironment().environment) ||
    process.env.INDEXNOW_ENABLED !== "true"
  ) {
    return notFound();
  }
  const key = validIndexNowKey(process.env.INDEXNOW_KEY);
  if (!key) return notFound();
  const context = await resolveServerMarketContext("/");
  if (context.kind !== "market" && context.kind !== "global_gateway") {
    return notFound();
  }
  return new Response(key, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=3600",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
