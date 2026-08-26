import type { NextConfig } from "next";
import path from "node:path";
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
const nextConfig: NextConfig = {
  agentRules: false,
  allowedDevOrigins,
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: [
    "@shongre/brand",
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
