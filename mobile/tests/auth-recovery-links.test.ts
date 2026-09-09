import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Platform: { OS: "web" } }));
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
}));

import { readFileSync } from "node:fs";
import { mobileEnvironment } from "@/config/environment";
import { getCountryConfig } from "@shongre/contracts";

/**
 * The sign-in screen offered email/password and social providers, and nothing
 * else: a person who forgot their password had no route out of the form, and a
 * new user could only join through a social provider. Until native screens
 * exist, both hand off to the market's Web flow — so the links have to be real,
 * market-scoped, and actually rendered.
 */
describe("native account recovery entry points", () => {
  it.each(["FR", "BE", "CH"])(
    "builds market-scoped registration and reset links for %s",
    (marketCode) => {
      const country = getCountryConfig(marketCode);
      expect(country).toBeTruthy();
      const links = mobileEnvironment.linksFor(country!);

      for (const url of [links.registerUrl, links.passwordResetUrl]) {
        expect(() => new URL(url)).not.toThrow();
      }
      expect(links.registerUrl).toContain("/inscription");
      expect(links.passwordResetUrl).toContain("/mot-de-passe-oublie");

      // Market scoping comes from the shared builder, never a concatenated
      // prefix: France has no path prefix, the others carry theirs.
      const basePath = country!.basePath === "/" ? "" : country!.basePath;
      expect(new URL(links.registerUrl).pathname).toBe(
        `${basePath}/inscription`,
      );
      expect(new URL(links.passwordResetUrl).pathname).toBe(
        `${basePath}/mot-de-passe-oublie`,
      );
    },
  );

  it("renders both entry points on the sign-in screen", () => {
    const source = readFileSync(
      new URL("../app/auth/login.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain("marketLinks.passwordResetUrl");
    expect(source).toContain("marketLinks.registerUrl");
    expect(source).toContain("Mot de passe oublié ?");
    expect(source).toContain("Créer un compte");
  });

  it("keeps every input-bearing screen inside keyboard avoidance", () => {
    const composer = readFileSync(
      new URL("../app/messages/[id].tsx", import.meta.url),
      "utf8",
    );
    // The composer is pinned below the transcript, exactly where the iOS
    // keyboard opens over it.
    expect(composer).toContain("KeyboardAvoidingView");

    const screen = readFileSync(
      new URL("../src/components/Screen.tsx", import.meta.url),
      "utf8",
    );
    expect(screen).toContain("KeyboardAvoidingView");
    // Stack screens must be able to claim the bottom inset; tab screens sit
    // above the tab bar, which already reserves it.
    expect(screen).toContain("edges");
  });

  it("gives stack screens the bottom safe-area inset", () => {
    for (const route of [
      "../app/auth/login.tsx",
      "../app/settings/index.tsx",
      "../app/account/billing.tsx",
      "../app/listing/[id].tsx",
    ]) {
      const source = readFileSync(new URL(route, import.meta.url), "utf8");
      expect(source, route).toContain('edges={["top", "bottom"]}');
    }
  });
});
