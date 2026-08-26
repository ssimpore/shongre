import "server-only";
import {
  createEnvironmentConfig,
  isProduction,
} from "@shongre/contracts/environment";
import type { PublicRuntimeConfig } from "./public-runtime-config";

function apiBaseUrl(apiOrigin: URL): string {
  return new URL("/api/v1", apiOrigin).toString().replace(/\/$/, "");
}

export function createPublicRuntimeConfig(): PublicRuntimeConfig {
  const environment = createEnvironmentConfig({
    appEnvironment: process.env.APP_ENV,
    environmentId: process.env.ENVIRONMENT_ID,
    publicFranceUrl: process.env.PUBLIC_FR_URL,
    publicInternationalUrl: process.env.PUBLIC_INTL_URL,
    apiUrl: process.env.API_URL,
  });
  const dataMode = process.env.NEXT_PUBLIC_DATA_MODE ?? "demo";
  if (dataMode !== "demo" && dataMode !== "api") {
    throw new Error(
      `[Web Config] NEXT_PUBLIC_DATA_MODE must be demo or api, received "${dataMode}".`,
    );
  }

  const mockStorageEnabled =
    process.env.NEXT_PUBLIC_ENABLE_MOCK_STORAGE !== "false";
  const stripePublishableKey =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  if (!isProduction(environment.environment)) {
    if (stripePublishableKey.startsWith("pk_live_")) {
      throw new Error(
        `[Web Config] ${environment.environment} cannot load a live Stripe publishable key.`,
      );
    }
  } else {
    const errors: string[] = [];
    if (dataMode !== "api") errors.push("NEXT_PUBLIC_DATA_MODE=api");
    if (mockStorageEnabled)
      errors.push("NEXT_PUBLIC_ENABLE_MOCK_STORAGE=false");
    if (!/^pk_live_[A-Za-z0-9]+$/.test(stripePublishableKey))
      errors.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_…");
    if (errors.length > 0) {
      throw new Error(
        `[Web Config] Production runtime configuration is unsafe: ${errors.join(", ")}.`,
      );
    }
  }

  return {
    appEnvironment: environment.environment,
    environmentId: environment.environmentId,
    franceUrl: environment.urls.franceApp.toString(),
    internationalUrl: environment.urls.internationalApp.toString(),
    apiBaseUrl: apiBaseUrl(environment.urls.api),
    dataMode,
    mockStorageEnabled,
    stripePublishableKey,
    release:
      process.env.RELEASE_SHA ||
      process.env.GIT_SHA ||
      process.env.IMAGE_DIGEST ||
      "unreleased",
    externalLinks: {
      appStore: process.env.NEXT_PUBLIC_APP_STORE_URL ?? "",
      googlePlay: process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL ?? "",
      instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL ?? "",
      facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL ?? "",
      linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN_URL ?? "",
      youtube: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_URL ?? "",
    },
  };
}

export function serializePublicRuntimeConfig(
  config: PublicRuntimeConfig,
): string {
  return JSON.stringify(config)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}
