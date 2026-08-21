import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { colors } from "@shongre/design-tokens";
import "../src/index.css";

const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  display: "swap",
  variable: "--font-inter",
  weight: "100 900",
});

const origin = process.env.PRODUCTION_WEB_URL ?? "https://shongre.com";

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: {
    default: "Shongre - Petites Annonces Particuliers & Pros",
    template: "%s",
  },
  description:
    "Plateforme moderne de petites annonces pour particuliers et professionnels avec réservation sécurisée, paiement, remise en main propre et livraison.",
  applicationName: "Shongre",
  icons: { icon: "/favicon.svg", apple: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: colors.action.primary,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Shongre",
    url: origin,
  };

  return (
    <html lang="fr" className={inter.variable}>
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
}
