import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const BRAND_SIGNATURE = "SHONGRE." as const;
export const BRAND_CONFIG_SCHEMA_VERSION = 1 as const;

export const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const brandConfigPath = path.join(
  repositoryRoot,
  "brand",
  "shongre",
  "brand.config.json",
);

export interface BrandConfig {
  $schema: "./brand.config.schema.json";
  schemaVersion: typeof BRAND_CONFIG_SCHEMA_VERSION;
  brand: "shongre";
  activeVersion: string;
}

export function normalizeBrandVersion(version: string): string {
  const normalized = version.trim().replace(/^v/, "");
  if (!/^\d+\.\d+\.\d+$/.test(normalized)) {
    throw new Error(
      `Brand version must be an exact semantic version; received ${JSON.stringify(version)}.`,
    );
  }
  return normalized;
}

export function brandCacheKey(version: string): string {
  return `shongre-${normalizeBrandVersion(version)}`;
}

export function parseBrandConfig(contents: string): BrandConfig {
  let value: unknown;
  try {
    value = JSON.parse(contents);
  } catch (error) {
    throw new Error(
      `brand.config.json is invalid JSON: ${(error as Error).message}`,
    );
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("brand.config.json must contain an object.");
  }
  const config = value as Record<string, unknown>;
  const expectedKeys = ["$schema", "schemaVersion", "brand", "activeVersion"];
  const keys = Object.keys(config).sort();
  if (JSON.stringify(keys) !== JSON.stringify([...expectedKeys].sort())) {
    throw new Error(
      `brand.config.json must contain only ${expectedKeys.join(", ")}.`,
    );
  }
  if (
    config.$schema !== "./brand.config.schema.json" ||
    config.schemaVersion !== BRAND_CONFIG_SCHEMA_VERSION ||
    config.brand !== "shongre" ||
    typeof config.activeVersion !== "string"
  ) {
    throw new Error("brand.config.json does not match the supported schema.");
  }
  return {
    $schema: config.$schema,
    schemaVersion: config.schemaVersion,
    brand: config.brand,
    activeVersion: normalizeBrandVersion(config.activeVersion),
  };
}

export function readBrandConfig(file = brandConfigPath): BrandConfig {
  return parseBrandConfig(readFileSync(file, "utf8"));
}

export function brandSourceRootForVersion(
  version: string,
  root = repositoryRoot,
): string {
  const normalized = normalizeBrandVersion(version);
  return path.join(root, "brand", "shongre", `v${normalized}`);
}

export function renderBrandConfig(activeVersion: string): string {
  const config: BrandConfig = {
    $schema: "./brand.config.schema.json",
    schemaVersion: BRAND_CONFIG_SCHEMA_VERSION,
    brand: "shongre",
    activeVersion: normalizeBrandVersion(activeVersion),
  };
  return `${JSON.stringify(config, null, 2)}\n`;
}

function readActiveBrandVersion(): string {
  const version = readBrandConfig().activeVersion;
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(
      `brand/shongre/brand.config.json activeVersion must contain a semantic version; received ${JSON.stringify(version)}.`,
    );
  }
  return version;
}

export const BRAND_VERSION = readActiveBrandVersion();
export const brandSourceRoot = brandSourceRootForVersion(BRAND_VERSION);
export const generatedInventoryPath = path.join(
  repositoryRoot,
  "scripts",
  "generated",
  "brand-assets.manifest.json",
);

export interface BrandAssetMapping {
  source: string;
  destination: string;
  public: boolean;
}

const web = (source: string, destination: string): BrandAssetMapping => ({
  source,
  destination: `frontend/public/${destination}`,
  public: true,
});

const mobile = (source: string, destination: string): BrandAssetMapping => ({
  source,
  destination: `mobile/assets/brand/${destination}`,
  public: false,
});

const iosAppIconFiles = [
  "AppIcon-1024.png",
  "AppIcon-20@2x.png",
  "AppIcon-20@3x.png",
  "AppIcon-29@2x.png",
  "AppIcon-29@3x.png",
  "AppIcon-40@2x.png",
  "AppIcon-40@3x.png",
  "AppIcon-60@2x.png",
  "AppIcon-60@3x.png",
  "AppIcon-iPad-20.png",
  "AppIcon-iPad-20@2x.png",
  "AppIcon-iPad-29.png",
  "AppIcon-iPad-29@2x.png",
  "AppIcon-iPad-40.png",
  "AppIcon-iPad-40@2x.png",
  "AppIcon-iPad-76.png",
  "AppIcon-iPad-76@2x.png",
  "AppIcon-iPad-83.5@2x.png",
  "Contents.json",
] as const;

const androidResourceFiles = [
  "drawable-nodpi/ic_launcher_background.png",
  "drawable-nodpi/ic_launcher_foreground.png",
  "drawable-nodpi/ic_launcher_monochrome.png",
  "mipmap-anydpi-v26/ic_launcher.xml",
  "mipmap-anydpi-v26/ic_launcher_round.xml",
  "mipmap-hdpi/ic_launcher.png",
  "mipmap-hdpi/ic_launcher_round.png",
  "mipmap-mdpi/ic_launcher.png",
  "mipmap-mdpi/ic_launcher_round.png",
  "mipmap-xhdpi/ic_launcher.png",
  "mipmap-xhdpi/ic_launcher_round.png",
  "mipmap-xxhdpi/ic_launcher.png",
  "mipmap-xxhdpi/ic_launcher_round.png",
  "mipmap-xxxhdpi/ic_launcher.png",
  "mipmap-xxxhdpi/ic_launcher_round.png",
  "values/colors.xml",
] as const;

export const brandAssetMappings: readonly BrandAssetMapping[] = [
  web("03_Web/favicon/favicon.ico", "favicon.ico"),
  web("03_Web/favicon/favicon-16x16.png", "favicon-16x16.png"),
  web("03_Web/favicon/favicon-32x32.png", "favicon-32x32.png"),
  web("03_Web/favicon/favicon-48x48.png", "favicon-48x48.png"),
  web("03_Web/favicon/favicon-64x64.png", "favicon-64x64.png"),
  web("03_Web/favicon/favicon-96x96.png", "favicon-96x96.png"),
  web("03_Web/apple-touch-icon.png", "apple-touch-icon.png"),

  web(
    "01_Logo/Vector_Compatibility/shongre-logo-horizontal-primary.svg",
    "brand/shongre/logo/horizontal-primary.svg",
  ),
  web(
    "01_Logo/Vector_Compatibility/shongre-logo-horizontal-reverse.svg",
    "brand/shongre/logo/horizontal-reverse.svg",
  ),
  web(
    "01_Logo/Color_Variants/shongre-logo-horizontal-mono-ink.png",
    "brand/shongre/logo/horizontal-mono-ink.png",
  ),
  web(
    "01_Logo/Color_Variants/shongre-logo-horizontal-mono-white.png",
    "brand/shongre/logo/horizontal-mono-white.png",
  ),
  web(
    "01_Logo/Color_Variants/shongre-logo-horizontal-mono-orange.png",
    "brand/shongre/logo/horizontal-mono-orange.png",
  ),
  web(
    "01_Logo/Vector_Compatibility/shongre-logo-stacked-primary.svg",
    "brand/shongre/logo/stacked-primary.svg",
  ),
  web(
    "01_Logo/Color_Variants/shongre-logo-stacked-mono-ink.png",
    "brand/shongre/logo/stacked-mono-ink.png",
  ),
  web(
    "01_Logo/Color_Variants/shongre-logo-stacked-mono-white.png",
    "brand/shongre/logo/stacked-mono-white.png",
  ),
  web(
    "01_Logo/Vector_Compatibility/shongre-wordmark-primary.svg",
    "brand/shongre/logo/wordmark-primary.svg",
  ),
  web(
    "01_Logo/Color_Variants/shongre-wordmark-reverse.png",
    "brand/shongre/logo/wordmark-reverse.png",
  ),
  web(
    "01_Logo/Color_Variants/shongre-wordmark-mono-ink.png",
    "brand/shongre/logo/wordmark-mono-ink.png",
  ),
  web(
    "01_Logo/Color_Variants/shongre-wordmark-mono-white.png",
    "brand/shongre/logo/wordmark-mono-white.png",
  ),
  ...([240, 480, 960] as const).flatMap((width) => [
    web(
      `03_Web/header/shongre-header-logo-${width}w.png`,
      `brand/shongre/logo/header-primary-${width}.png`,
    ),
    web(
      `03_Web/header/shongre-header-logo-reverse-${width}w.png`,
      `brand/shongre/logo/header-reverse-${width}.png`,
    ),
  ]),

  web(
    "02_Icon/Master/shongre-icon-primary.svg",
    "brand/shongre/icon/primary.svg",
  ),
  web(
    "02_Icon/Color_Variants/shongre-icon-mono-ink.svg",
    "brand/shongre/icon/mono-ink.svg",
  ),
  web(
    "02_Icon/Color_Variants/shongre-icon-mono-white.svg",
    "brand/shongre/icon/mono-white.svg",
  ),
  web(
    "02_Icon/Color_Variants/shongre-icon-mono-orange.png",
    "brand/shongre/icon/mono-orange.png",
  ),

  web(
    "03_Web/open-graph/shongre-og-light-1200x630.png",
    "brand/shongre/social/open-graph-light.png",
  ),
  web(
    "03_Web/open-graph/shongre-og-dark-1200x630.png",
    "brand/shongre/social/open-graph-dark.png",
  ),
  web("03_Web/pwa/icon-192x192.png", "brand/shongre/pwa/icon-192.png"),
  web("03_Web/pwa/icon-512x512.png", "brand/shongre/pwa/icon-512.png"),
  web(
    "03_Web/pwa/icon-maskable-192x192.png",
    "brand/shongre/pwa/icon-maskable-192.png",
  ),
  web(
    "03_Web/pwa/icon-maskable-512x512.png",
    "brand/shongre/pwa/icon-maskable-512.png",
  ),

  mobile("04_iOS/AppIcon.appiconset/AppIcon-1024.png", "app-icon.png"),
  mobile("04_iOS/alternates/AppIcon-Dark-1024.png", "app-icon-dark.png"),
  mobile("04_iOS/alternates/AppIcon-Tinted-1024.png", "app-icon-tinted.png"),
  mobile(
    "05_Android/play-store/play-store-icon-512.png",
    "android/play-store-icon.png",
  ),
  mobile(
    "05_Android/app/src/main/res/drawable-nodpi/ic_launcher_foreground.png",
    "adaptive-icon-foreground.png",
  ),
  mobile(
    "05_Android/app/src/main/res/drawable-nodpi/ic_launcher_background.png",
    "adaptive-icon-background.png",
  ),
  mobile(
    "05_Android/app/src/main/res/drawable-nodpi/ic_launcher_monochrome.png",
    "adaptive-icon-monochrome.png",
  ),
  mobile("03_Web/favicon/favicon-96x96.png", "favicon.png"),
  mobile(
    "03_Web/header/shongre-header-logo-480w.png",
    "logo/horizontal-primary.png",
  ),
  mobile(
    "03_Web/header/shongre-header-logo-reverse-480w.png",
    "logo/horizontal-reverse.png",
  ),
  mobile("01_Logo/Raster/shongre-logo-stacked-512.png", "splash-logo.png"),
  ...iosAppIconFiles.map((file) =>
    mobile(
      `04_iOS/AppIcon.appiconset/${file}`,
      `native/ios/AppIcon.appiconset/${file}`,
    ),
  ),
  mobile(
    "04_iOS/alternates/AppIcon-Dark-1024.png",
    "native/ios/AppIcon.appiconset/AppIcon-Dark-1024.png",
  ),
  mobile(
    "04_iOS/alternates/AppIcon-Tinted-1024.png",
    "native/ios/AppIcon.appiconset/AppIcon-Tinted-1024.png",
  ),
  ...androidResourceFiles.map((file) =>
    mobile(`05_Android/app/src/main/res/${file}`, `native/android/res/${file}`),
  ),
];

export const brandTokenSource = "08_Design_Tokens/brand-tokens.json";
export const brandTokenAdapterDestination =
  "packages/design-tokens/src/brand.generated.js";
export const brandTokenTypesDestination =
  "packages/design-tokens/src/brand.generated.d.ts";
export const brandDocumentLogoSource =
  "03_Web/header/shongre-header-logo-240w.png";
export const brandDocumentReverseLogoSource =
  "03_Web/header/shongre-header-logo-reverse-240w.png";
export const brandDocumentAdapterDestination =
  "packages/brand/src/document.generated.ts";
export const brandActiveRegistryDestination =
  "packages/brand/src/active.generated.ts";
export const brandWebRegistryDestination =
  "packages/brand/src/web-assets.generated.ts";
export const brandMobileRegistryDestination =
  "mobile/brand-assets.generated.json";
export const brandMobileImageRegistryDestination =
  "mobile/src/brand-images.generated.ts";

export const brandGeneratedDestinations = [
  ...brandAssetMappings.map(({ destination }) => destination),
  brandActiveRegistryDestination,
  brandDocumentAdapterDestination,
  brandTokenAdapterDestination,
  brandTokenTypesDestination,
  brandWebRegistryDestination,
  brandMobileRegistryDestination,
  brandMobileImageRegistryDestination,
] as const;

/**
 * Semantic consumer registry. Every destination must also be owned by
 * `brandAssetMappings`; generated registries keep application code free of
 * duplicated public and Expo asset paths.
 */
export const brandConsumerAssets = {
  web: {
    favicon: {
      ico: "frontend/public/favicon.ico",
      png: [16, 32, 48, 64, 96].map(
        (size) => `frontend/public/favicon-${size}x${size}.png`,
      ),
      appleTouch: "frontend/public/apple-touch-icon.png",
    },
    logo: {
      horizontal: {
        primary: "frontend/public/brand/shongre/logo/header-primary-480.png",
        reverse: "frontend/public/brand/shongre/logo/header-reverse-480.png",
        monoInk: "frontend/public/brand/shongre/logo/horizontal-mono-ink.png",
        monoWhite:
          "frontend/public/brand/shongre/logo/horizontal-mono-white.png",
        monoOrange:
          "frontend/public/brand/shongre/logo/horizontal-mono-orange.png",
      },
      stacked: {
        primary: "frontend/public/brand/shongre/logo/stacked-primary.svg",
        monoInk: "frontend/public/brand/shongre/logo/stacked-mono-ink.png",
        monoWhite: "frontend/public/brand/shongre/logo/stacked-mono-white.png",
      },
      wordmark: {
        primary: "frontend/public/brand/shongre/logo/wordmark-primary.svg",
        reverse: "frontend/public/brand/shongre/logo/wordmark-reverse.png",
        monoInk: "frontend/public/brand/shongre/logo/wordmark-mono-ink.png",
        monoWhite: "frontend/public/brand/shongre/logo/wordmark-mono-white.png",
      },
      headerPrimary: [240, 480, 960].map(
        (size) =>
          `frontend/public/brand/shongre/logo/header-primary-${size}.png`,
      ),
      headerReverse: [240, 480, 960].map(
        (size) =>
          `frontend/public/brand/shongre/logo/header-reverse-${size}.png`,
      ),
    },
    icon: {
      primary: "frontend/public/brand/shongre/pwa/icon-maskable-192.png",
      structuredData: "frontend/public/brand/shongre/icon/primary.svg",
      monoInk: "frontend/public/brand/shongre/icon/mono-ink.svg",
      monoWhite: "frontend/public/brand/shongre/icon/mono-white.svg",
      monoOrange: "frontend/public/brand/shongre/icon/mono-orange.png",
    },
    pwa: {
      any192: "frontend/public/brand/shongre/pwa/icon-192.png",
      any512: "frontend/public/brand/shongre/pwa/icon-512.png",
      maskable192: "frontend/public/brand/shongre/pwa/icon-maskable-192.png",
      maskable512: "frontend/public/brand/shongre/pwa/icon-maskable-512.png",
    },
    social: {
      openGraphLight:
        "frontend/public/brand/shongre/social/open-graph-light.png",
      openGraphDark: "frontend/public/brand/shongre/social/open-graph-dark.png",
    },
  },
  mobile: {
    appIcon: "mobile/assets/brand/app-icon.png",
    splashLogo: "mobile/assets/brand/splash-logo.png",
    favicon: "mobile/assets/brand/favicon.png",
    androidStoreIcon: "mobile/assets/brand/android/play-store-icon.png",
    adaptiveForeground: "mobile/assets/brand/adaptive-icon-foreground.png",
    adaptiveBackground: "mobile/assets/brand/adaptive-icon-background.png",
    adaptiveMonochrome: "mobile/assets/brand/adaptive-icon-monochrome.png",
    horizontalPrimary: "mobile/assets/brand/logo/horizontal-primary.png",
    horizontalReverse: "mobile/assets/brand/logo/horizontal-reverse.png",
    nativeIosAppIconSet: "mobile/assets/brand/native/ios/AppIcon.appiconset",
    nativeAndroidResources: "mobile/assets/brand/native/android/res",
  },
} as const;

export const requiredImageProperties = [
  { source: "03_Web/favicon/favicon-16x16.png", width: 16, height: 16 },
  { source: "03_Web/favicon/favicon-32x32.png", width: 32, height: 32 },
  { source: "03_Web/favicon/favicon-48x48.png", width: 48, height: 48 },
  { source: "03_Web/favicon/favicon-64x64.png", width: 64, height: 64 },
  { source: "03_Web/favicon/favicon-96x96.png", width: 96, height: 96 },
  { source: "03_Web/apple-touch-icon.png", width: 180, height: 180 },
  { source: "03_Web/pwa/icon-192x192.png", width: 192, height: 192 },
  { source: "03_Web/pwa/icon-512x512.png", width: 512, height: 512 },
  {
    source: "03_Web/pwa/icon-maskable-192x192.png",
    width: 192,
    height: 192,
  },
  {
    source: "03_Web/pwa/icon-maskable-512x512.png",
    width: 512,
    height: 512,
  },
  {
    source: "03_Web/open-graph/shongre-og-light-1200x630.png",
    width: 1200,
    height: 630,
  },
  {
    source: "03_Web/open-graph/shongre-og-dark-1200x630.png",
    width: 1200,
    height: 630,
  },
  {
    source: "06_Social/Generic/social-share-1200x630.png",
    width: 1200,
    height: 630,
  },
  {
    source: "04_iOS/AppIcon.appiconset/AppIcon-1024.png",
    width: 1024,
    height: 1024,
    opaque: true,
  },
  {
    source:
      "05_Android/app/src/main/res/drawable-nodpi/ic_launcher_foreground.png",
    width: 432,
    height: 432,
  },
  {
    source:
      "05_Android/app/src/main/res/drawable-nodpi/ic_launcher_background.png",
    width: 432,
    height: 432,
    opaque: true,
  },
  {
    source:
      "05_Android/app/src/main/res/drawable-nodpi/ic_launcher_monochrome.png",
    width: 432,
    height: 432,
  },
] as const;
