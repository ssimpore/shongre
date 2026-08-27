import type { PublicRuntimeConfig } from "../platform/runtime-config/public-runtime-config";

const SCRIPT_ID = "shongre-cloudflare-web-analytics";

/** Cloudflare is RUM-only here: it never receives Shongre custom events. */
export function configureCloudflareWebAnalytics(
  config: PublicRuntimeConfig,
  permitted: boolean,
): void {
  const existing = document.getElementById(SCRIPT_ID);
  const enabled =
    permitted &&
    config.appEnvironment === "production" &&
    config.analytics.mode === "production" &&
    config.analytics.cloudflare.enabled &&
    Boolean(config.analytics.cloudflare.token);
  if (!enabled) {
    existing?.remove();
    return;
  }
  if (existing) return;
  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.type = "module";
  script.src = "https://static.cloudflareinsights.com/beacon.min.js";
  script.dataset.cfBeacon = JSON.stringify({
    token: config.analytics.cloudflare.token,
    spa: true,
  });
  document.head.appendChild(script);
}
