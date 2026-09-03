import type { Metadata, Viewport } from "next";
import { Nunito_Sans } from "next/font/google";
import { headers } from "next/headers";
import { colors } from "@shongre/design-tokens";
import "../src/index.css";
import {
  DEFAULT_DESCRIPTION,
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

export function generateMetadata(): Metadata {
  return {
    metadataBase: webEnvironmentFromEnvironment().urls.internationalApp,
    title: {
      default: DEFAULT_TITLE,
      template: "%s",
    },
    description: DEFAULT_DESCRIPTION,
    applicationName: "Shongre",
    icons: { icon: "/favicon.svg", apple: "/favicon.svg" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: colors.action.primary,
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
