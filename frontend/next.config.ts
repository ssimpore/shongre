import type { NextConfig } from 'next';
import path from 'node:path';

const dataMode = process.env.NEXT_PUBLIC_DATA_MODE ?? process.env.VITE_DATA_MODE ?? 'demo';
if (dataMode !== 'demo' && dataMode !== 'api') {
  throw new Error(`[Web Config] NEXT_PUBLIC_DATA_MODE must be "demo" or "api", received "${dataMode}".`);
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? process.env.VITE_API_URL ?? '';
let apiOrigin = '';
try {
  apiOrigin = apiUrl ? new URL(apiUrl).origin : '';
} catch {
  throw new Error('[Web Config] NEXT_PUBLIC_API_URL must be an absolute URL when provided.');
}
const isProduction = process.env.NODE_ENV === 'production';
const allowedDevOrigins = Array.from(
  new Set([
    'dev.shongre.com',
    ...(process.env.SHONGRE_ALLOWED_DEV_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  ]),
);
// Turbopack development chunks keep path-stable URLs while their contents
// change. A tunnel/CDN or browser must not reuse one across module graphs.
const developmentAssetHeaders = [
  { key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
  { key: 'Cloudflare-CDN-Cache-Control', value: 'no-store' },
  { key: 'CDN-Cache-Control', value: 'no-store' },
];
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ''}${isProduction ? '' : ' http: ws: wss:'}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProduction ? ['upgrade-insecure-requests'] : []),
].join('; ');

const nextConfig: NextConfig = {
  agentRules: false,
  allowedDevOrigins,
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: [
    '@shongre/brand',
    '@shongre/contracts',
    '@shongre/design-tokens',
    '@shongre/features',
    '@shongre/shared',
    '@shongre/ui',
  ],
  env: {
    NEXT_PUBLIC_DATA_MODE: dataMode,
    NEXT_PUBLIC_API_URL: apiUrl,
  },
  async headers() {
    return [
      ...(!isProduction
        ? [
            {
              source: '/_next/:path*',
              headers: developmentAssetHeaders,
            },
          ]
        : []),
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
    ];
  },
  turbopack: {
    root: path.resolve(process.cwd(), '..'),
  },
};

export default nextConfig;
