import type { NextConfig } from "next";
import path from "node:path";

const dataMode =
  process.env.NEXT_PUBLIC_DATA_MODE ?? process.env.VITE_DATA_MODE ?? "demo";
if (dataMode !== "demo" && dataMode !== "api") {
  throw new Error(
    `[Web Config] NEXT_PUBLIC_DATA_MODE must be "demo" or "api", received "${dataMode}".`,
  );
}

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? process.env.VITE_API_URL ?? "";
let apiOrigin = "";
let parsedApiUrl: URL | undefined;
try {
  parsedApiUrl = apiUrl ? new URL(apiUrl) : undefined;
  apiOrigin = parsedApiUrl?.origin ?? "";
} catch {
  throw new Error(
    "[Web Config] NEXT_PUBLIC_API_URL must be an absolute URL when provided.",
  );
}
const isProduction = process.env.NODE_ENV === "production";
const isProductionRelease = process.env.APP_ENV === "production";
const allowHttpInE2E =
  process.env.SHONGRE_E2E_ALLOW_HTTP === "1" && !isProductionRelease;

if (isProductionRelease) {
  const releaseErrors: string[] = [];
  if (dataMode !== "api") releaseErrors.push("NEXT_PUBLIC_DATA_MODE=api");
  if (!parsedApiUrl) releaseErrors.push("NEXT_PUBLIC_API_URL");
  else if (parsedApiUrl.protocol !== "https:")
    releaseErrors.push("NEXT_PUBLIC_API_URL must use HTTPS");
  if (process.env.NEXT_PUBLIC_ENABLE_MOCK_STORAGE !== "false")
    releaseErrors.push("NEXT_PUBLIC_ENABLE_MOCK_STORAGE=false");
  if (
    !/^pk_live_[A-Za-z0-9]+$/.test(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
    )
  )
    releaseErrors.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_…");
  if (releaseErrors.length > 0) {
    throw new Error(
      `[Web Config] Production release configuration is unsafe: ${releaseErrors.join(", ")}.`,
    );
  }
}
const allowedDevOrigins = Array.from(
  new Set([
    "dev.shongre.com",
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
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https://api.stripe.com${apiOrigin ? ` ${apiOrigin}` : ""}${isProduction ? "" : " http: ws: wss:"}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProduction && !allowHttpInE2E ? ["upgrade-insecure-requests"] : []),
].join("; ");

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
  env: {
    NEXT_PUBLIC_DATA_MODE: dataMode,
    NEXT_PUBLIC_API_URL: apiUrl,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  },
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
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
  turbopack: {
    root: path.resolve(process.cwd(), ".."),
  },
};

export default nextConfig;
