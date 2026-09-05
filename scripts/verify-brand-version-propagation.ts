#!/usr/bin/env node

import {
  BRAND_VERSION,
  brandAssetMappings,
  brandCacheKey,
  parseBrandConfig,
  readBrandConfig,
  renderBrandConfig,
} from "./brand-assets.config";
import {
  renderBrandActiveRegistry,
  renderBrandMobileRegistry,
  renderBrandWebRegistry,
} from "./brand-assets.lib";

const current = readBrandConfig();
const [major, minor, patch] = current.activeVersion.split(".").map(Number);
const probeVersion = [major, minor, patch + 1].join(".");
const probeConfig = parseBrandConfig(renderBrandConfig(probeVersion));
if (probeConfig.activeVersion !== probeVersion) {
  throw new Error(
    "Changing activeVersion does not round-trip through the schema.",
  );
}

Promise.all([
  renderBrandActiveRegistry(current.activeVersion),
  renderBrandActiveRegistry(probeVersion),
  renderBrandWebRegistry(current.activeVersion),
  renderBrandWebRegistry(probeVersion),
])
  .then(([currentIdentity, probeIdentity, currentWeb, probeWeb]) => {
    const currentMobile = renderBrandMobileRegistry(current.activeVersion);
    const probeMobile = renderBrandMobileRegistry(probeVersion);

    for (const [name, before, after] of [
      ["typed identity", currentIdentity, probeIdentity],
      ["Web registry", currentWeb, probeWeb],
      ["Expo/native registry", currentMobile, probeMobile],
    ] as const) {
      if (before === after) {
        throw new Error(`${name} does not react to an activeVersion change.`);
      }
      if (!before.includes(brandCacheKey(current.activeVersion))) {
        throw new Error(`${name} is missing the current cache key.`);
      }
      if (!after.includes(brandCacheKey(probeVersion))) {
        throw new Error(`${name} is missing the probe cache key.`);
      }
    }

    const publicMappingCount = brandAssetMappings.filter(
      ({ public: isPublic }) => isPublic,
    ).length;
    const versionedUrlCount = (probeWeb.match(/\?brand=/g) ?? []).length;
    if (versionedUrlCount < publicMappingCount) {
      throw new Error(
        `Only ${versionedUrlCount} Web registry URLs are cache-versioned for ${publicMappingCount} public mappings.`,
      );
    }
    if (BRAND_VERSION !== current.activeVersion) {
      throw new Error(
        "Tooling constants do not resolve the configured activeVersion.",
      );
    }

    process.stdout.write(
      `A one-field activeVersion mutation propagated to the typed identity, every Web cache key, and the Expo/native registry across ${brandAssetMappings.length} deterministic mappings.\n`,
    );
  })
  .catch((error: unknown) => {
    process.stderr.write(
      `Brand version propagation failed: ${(error as Error).message}\n`,
    );
    process.exit(1);
  });
