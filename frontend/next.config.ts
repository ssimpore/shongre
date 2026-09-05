import type { NextConfig } from "next";
import path from "node:path";
import { SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS } from "@shongre/contracts/performance";
const isProduction = process.env.NODE_ENV === "production";
const allowedDevOrigins = Array.from(
  new Set([
    ...(process.env.SHONGRE_ALLOWED_DEV_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ]),
);
// Turbopack development chunks keep path-stable URLs while their contents
// change. A tunnel/CDN or browser must not reuse one across module graphs.
const developmentAssetHeaders = [
  { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
  { key: "Cloudflare-CDN-Cache-Control", value: "no-store" },
  { key: "CDN-Cache-Control", value: "no-store" },
];
const publicReferenceCache =
  SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.publicCache.reference;
const generatedAssetHeaders = [
  {
    key: "Cache-Control",
    value: `public, max-age=${publicReferenceCache.browserMaxAgeSeconds}, s-maxage=${publicReferenceCache.sharedMaxAgeSeconds}, stale-while-revalidate=${publicReferenceCache.staleWhileRevalidateSeconds}, stale-if-error=${publicReferenceCache.staleIfErrorSeconds}`,
  },
];
const nextConfig: NextConfig = {
  agentRules: false,
  allowedDevOrigins,
  devIndicators: { position: "top-right" },
  output: "standalone",
  poweredByHeader: false,
  productionBrowserSourceMaps: true,
  reactStrictMode: true,
  transpilePackages: [
    "@shongre/contracts",
    "@shongre/design-tokens",
    "@shongre/features",
    "@shongre/shared",
    "@shongre/ui",
  ],
  async redirects() {
    return [
      { source: "/cours", destination: "/education", permanent: true },
      {
        source: "/cours/:path*",
        destination: "/education/:path*",
        permanent: true,
      },
      {
        source: "/deposer/cours",
        destination: "/deposer/education",
        permanent: true,
      },
      {
        source: "/compte/cours",
        destination: "/compte/education",
        permanent: true,
      },
      {
        source: "/compte/cours/:path*",
        destination: "/compte/education/:path*",
        permanent: true,
      },
      {
        source: "/admin/cours",
        destination: "/admin/education",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      ...(isProduction
        ? [
            {
              source: "/brand/shongre/:path*",
              headers: generatedAssetHeaders,
            },
            {
              source:
                "/:icon(favicon\\.ico|favicon-[0-9]+x[0-9]+\\.png|apple-touch-icon\\.png)",
              headers: generatedAssetHeaders,
            },
          ]
        : []),
      ...(!isProduction && process.env.SHONGRE_DISABLE_DEV_ASSET_HEADERS !== "1"
        ? [
            {
              source: "/_next/:path*",
              headers: developmentAssetHeaders,
            },
          ]
        : []),
    ];
  },
  turbopack: {
    root: path.resolve(process.cwd(), ".."),
  },
};

export default nextConfig;
