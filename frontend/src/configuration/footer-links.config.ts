import { getPublicRuntimeConfig } from "../platform/runtime-config/public-runtime-config";

export type MobileStoreId = "app-store" | "google-play";
export type SocialNetworkId = "instagram" | "facebook" | "linkedin" | "youtube";

export interface FooterExternalLink<Id extends string> {
  id: Id;
  name: string;
  url: string | null;
}

/**
 * Public footer destinations are optional until the corresponding Shongre
 * account or application is published. Only verified HTTPS hosts become live
 * links; missing or malformed values remain truthful "coming soon" controls.
 */
export function resolvePublicExternalUrl(
  rawValue: string | undefined,
  allowedHosts: readonly string[],
): string | null {
  const value = rawValue?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    const hasAllowedHost = allowedHosts.some(
      (allowedHost) =>
        hostname === allowedHost || hostname.endsWith(`.${allowedHost}`),
    );

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !hasAllowedHost
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export const MOBILE_STORE_LINKS: readonly FooterExternalLink<MobileStoreId>[] =
  [
    {
      id: "app-store",
      name: "App Store",
      url: resolvePublicExternalUrl(
        getPublicRuntimeConfig().externalLinks.appStore,
        ["apps.apple.com"],
      ),
    },
    {
      id: "google-play",
      name: "Google Play",
      url: resolvePublicExternalUrl(
        getPublicRuntimeConfig().externalLinks.googlePlay,
        ["play.google.com"],
      ),
    },
  ] as const;

export const SOCIAL_LINKS: readonly FooterExternalLink<SocialNetworkId>[] = [
  {
    id: "instagram",
    name: "Instagram",
    url: resolvePublicExternalUrl(
      getPublicRuntimeConfig().externalLinks.instagram,
      ["instagram.com"],
    ),
  },
  {
    id: "facebook",
    name: "Facebook",
    url: resolvePublicExternalUrl(
      getPublicRuntimeConfig().externalLinks.facebook,
      ["facebook.com", "fb.com"],
    ),
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    url: resolvePublicExternalUrl(
      getPublicRuntimeConfig().externalLinks.linkedin,
      ["linkedin.com"],
    ),
  },
  {
    id: "youtube",
    name: "YouTube",
    url: resolvePublicExternalUrl(
      getPublicRuntimeConfig().externalLinks.youtube,
      ["youtube.com", "youtu.be"],
    ),
  },
] as const;
