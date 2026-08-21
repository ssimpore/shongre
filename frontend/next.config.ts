import type { NextConfig } from 'next';
import path from 'node:path';

const dataMode = process.env.NEXT_PUBLIC_DATA_MODE ?? process.env.VITE_DATA_MODE ?? 'demo';
if (dataMode !== 'demo' && dataMode !== 'api') {
  throw new Error(`[Web Config] NEXT_PUBLIC_DATA_MODE must be "demo" or "api", received "${dataMode}".`);
}

const nextConfig: NextConfig = {
  agentRules: false,
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
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? process.env.VITE_API_URL ?? '',
  },
  turbopack: {
    root: path.resolve(process.cwd(), '..'),
  },
};

export default nextConfig;
