import type { Metadata, Viewport } from "next";
import { Nunito_Sans } from "next/font/google";
import { headers } from "next/headers";
import { brand } from "@shongre/brand";
import { colors } from "@shongre/design-tokens";
import "../src/index.css";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_SHARE_IMAGE_PATH,
  DEFAULT_TITLE,
} from "../src/services/seo.service";
import { DEFAULT_LOCALE } from "../src/i18n/locale";
import { webEnvironmentFromEnvironment } from "../src/platform/market/market-infrastructure";
import {
  createPublicRuntimeConfig,
  serializePublicRuntimeConfig,
} from "../src/platform/runtime-config/public-runtime-config.server";

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito-sans",
  weight: "variable",
  style: "normal",
});

const versionedBrandAsset = (path: string) => `${path}?v=${brand.version}`;

export function generateMetadata(): Metadata {
  return {
    metadataBase: webEnvironmentFromEnvironment().urls.internationalApp,
    title: {
      default: DEFAULT_TITLE,
      template: "%s",
    },
    description: DEFAULT_DESCRIPTION,
    applicationName: "SHONGRE.",
    icons: {
      icon: [
        {
          url: versionedBrandAsset("/favicon-16x16.png"),
          type: "image/png",
          sizes: "16x16",
        },
        {
          url: versionedBrandAsset("/favicon-32x32.png"),
          type: "image/png",
          sizes: "32x32",
        },
        {
          url: versionedBrandAsset("/favicon-48x48.png"),
          type: "image/png",
          sizes: "48x48",
        },
        {
          url: versionedBrandAsset("/favicon-64x64.png"),
          type: "image/png",
          sizes: "64x64",
        },
        {
          url: versionedBrandAsset("/favicon-96x96.png"),
          type: "image/png",
          sizes: "96x96",
        },
      ],
      shortcut: [
        {
          url: versionedBrandAsset("/favicon.ico"),
          type: "image/x-icon",
        },
      ],
      apple: [
        {
          url: versionedBrandAsset("/apple-touch-icon.png"),
          type: "image/png",
          sizes: "180x180",
        },
      ],
    },
    manifest: "/manifest.webmanifest",
    openGraph: {
      type: "website",
      siteName: "SHONGRE.",
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      images: [
        {
          url: DEFAULT_SHARE_IMAGE_PATH,
          width: 1200,
          height: 630,
          alt: "SHONGRE. — place de marché locale",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      images: [DEFAULT_SHARE_IMAGE_PATH],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: colors.brand.primary,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const requestLocale =
    requestHeaders.get("x-shongre-market-locale") || DEFAULT_LOCALE;
  const runtimeConfig = serializePublicRuntimeConfig(
    createPublicRuntimeConfig(),
  );
  return (
    <html lang={requestLocale} className={nunitoSans.variable}>
      <body>
        <script
          id="shongre-runtime-config"
          dangerouslySetInnerHTML={{
            __html: `window.__SHONGRE_RUNTIME_CONFIG__=${runtimeConfig};`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
