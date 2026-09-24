import type { Metadata, Viewport } from "next";
import { Nunito_Sans } from "next/font/google";
import { headers } from "next/headers";
import { brand } from "@shongre/brand";
import { webBrandAssets } from "@shongre/brand/web";
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
import { validWebmasterVerificationToken } from "../src/platform/seo/discovery-governance";

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito-sans",
  weight: "variable",
  style: "normal",
});

export function generateMetadata(): Metadata {
  const googleVerification = validWebmasterVerificationToken(
    process.env.SEO_GOOGLE_SITE_VERIFICATION,
  );
  const bingVerification = validWebmasterVerificationToken(
    process.env.SEO_BING_SITE_VERIFICATION,
  );
  return {
    metadataBase: webEnvironmentFromEnvironment().urls.internationalApp,
    title: {
      default: DEFAULT_TITLE,
      template: "%s",
    },
    description: DEFAULT_DESCRIPTION,
    applicationName: brand.name,
    icons: {
      icon: webBrandAssets.favicon.png.map(({ src, ...metadata }) => ({
        url: src,
        ...metadata,
      })),
      shortcut: [
        {
          url: webBrandAssets.favicon.ico.src,
          type: webBrandAssets.favicon.ico.type,
        },
      ],
      apple: [
        {
          url: webBrandAssets.favicon.appleTouch.src,
          type: webBrandAssets.favicon.appleTouch.type,
          sizes: webBrandAssets.favicon.appleTouch.sizes,
        },
      ],
    },
    manifest: webBrandAssets.manifest,
    openGraph: {
      type: "website",
      siteName: brand.name,
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
    ...(googleVerification || bingVerification
      ? {
          verification: {
            ...(googleVerification ? { google: googleVerification } : {}),
            ...(bingVerification
              ? { other: { "msvalidate.01": bingVerification } }
              : {}),
          },
        }
      : {}),
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
  const nonce = requestHeaders.get("x-shongre-csp-nonce") || undefined;
  const runtimeConfig = serializePublicRuntimeConfig(
    createPublicRuntimeConfig(),
  );
  return (
    <html lang={requestLocale} className={nunitoSans.variable}>
      <body>
        <script
          id="shongre-runtime-config"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `window.__SHONGRE_RUNTIME_CONFIG__=${runtimeConfig};`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
