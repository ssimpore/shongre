/// <reference types="node" />

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Expo brand integration", () => {
  it("keeps Expo configuration on synchronized official assets", () => {
    const config = readFileSync(path.join(root, "app.config.ts"), "utf8");
    expect(config).toContain('name: "SHONGRE."');
    expect(config).toContain('icon: "./assets/brand/app-icon.png"');
    expect(config).toContain("adaptive-icon-foreground.png");
    expect(config).toContain("adaptive-icon-background.png");
    expect(config).toContain("adaptive-icon-monochrome.png");
    expect(config).toContain('"./plugins/with-brand-assets"');
  });

  it("installs only exact generated launcher resources", () => {
    const plugin = readFileSync(
      path.join(root, "plugins/with-brand-assets.cjs"),
      "utf8",
    );
    expect(plugin).toContain("AppIcon.appiconset");
    expect(plugin).toContain("ic_launcher_background");
    expect(plugin).toContain("removeGeneratedAndroidIcons");
    expect(plugin).toContain("withFinalizedMod");
    expect(plugin).not.toContain("withDangerousMod");
    expect(plugin).not.toMatch(/rmSync\([^)]*recursive\s*:\s*true/);
  });
});
