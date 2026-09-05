/// <reference types="node" />

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Expo brand integration", () => {
  it("keeps Expo configuration on synchronized official assets", () => {
    const config = readFileSync(path.join(root, "app.config.ts"), "utf8");
    const registry = JSON.parse(
      readFileSync(path.join(root, "brand-assets.generated.json"), "utf8"),
    ) as {
      brandSignature: string;
      brandVersion: string;
      expo: Record<string, string>;
      native: Record<string, string>;
    };
    const brandConfig = JSON.parse(
      readFileSync(
        path.join(root, "../brand/shongre/brand.config.json"),
        "utf8",
      ),
    ) as { activeVersion: string };
    expect(config).toContain("name: mobileBrandAssets.brandSignature");
    expect(config).toContain("icon: mobileBrandAssets.expo.appIcon");
    expect(config).toContain("mobileBrandAssets.expo.adaptiveForeground");
    expect(config).toContain("mobileBrandAssets.expo.adaptiveBackground");
    expect(config).toContain("mobileBrandAssets.expo.adaptiveMonochrome");
    expect(config).toContain('"./plugins/with-brand-assets"');
    expect(registry).toMatchObject({
      brandSignature: "SHONGRE.",
      brandVersion: brandConfig.activeVersion,
      expo: {
        appIcon: "./assets/brand/app-icon.png",
        adaptiveForeground: "./assets/brand/adaptive-icon-foreground.png",
        adaptiveBackground: "./assets/brand/adaptive-icon-background.png",
        adaptiveMonochrome: "./assets/brand/adaptive-icon-monochrome.png",
      },
    });
  });

  it("installs only exact generated launcher resources", () => {
    const plugin = readFileSync(
      path.join(root, "plugins/with-brand-assets.cjs"),
      "utf8",
    );
    expect(plugin).toContain("mobileBrandAssets.native.iosAppIconSet");
    expect(plugin).toContain("mobileBrandAssets.native.androidResources");
    expect(plugin).toContain("ic_launcher_background");
    expect(plugin).toContain("removeGeneratedAndroidIcons");
    expect(plugin).toContain("withFinalizedMod");
    expect(plugin).not.toContain("withDangerousMod");
    expect(plugin).not.toMatch(/rmSync\([^)]*recursive\s*:\s*true/);
  });
});
