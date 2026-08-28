import { describe, expect, it } from "vitest";
import {
  applicationIdForHostname,
  createApplicationRegistry,
  normalizeApplicationHostname,
  resolveApplicationHref,
} from "./application-registry";

describe("application registry", () => {
  it("resolves live application hosts and canonical targets", () => {
    const registry = createApplicationRegistry({
      environment: "production",
      marketplaceOrigin: "https://shongre.fr",
    });
    expect(
      applicationIdForHostname("Solutions.Shongre.Fr:443", registry),
    ).toBe("solutions");
    expect(resolveApplicationHref(registry, "facturation", "/")).toBe(
      "https://facturation.shongre.fr/",
    );
    expect(applicationIdForHostname("solutions.shongre.fr", registry)).toBe(
      "solutions",
    );
    expect(applicationIdForHostname("prospects.shongre.fr", registry)).toBe(
      "prospects",
    );
    expect(applicationIdForHostname("facturation.shongre.fr", registry)).toBe(
      "facturation",
    );
    expect(applicationIdForHostname("unknown.shongre.fr", registry)).toBeNull();
  });

  it("supports explicit preview and staging origins at runtime", () => {
    const registry = createApplicationRegistry({
      environment: "staging",
      marketplaceOrigin: "https://staging.shongre.fr",
      origins: {
        solutions: "https://solutions-staging.shongre.fr",
        prospects: "https://prospects-preview.shongre.fr",
        facturation: "https://facturation-staging.shongre.fr",
      },
    });
    expect(
      applicationIdForHostname("prospects-preview.shongre.fr", registry),
    ).toBe("prospects");
    expect(resolveApplicationHref(registry, "solutions", "/facturation")).toBe(
      "https://solutions-staging.shongre.fr/facturation",
    );
  });

  it("uses the documented local fallback routes", () => {
    const registry = createApplicationRegistry({
      environment: "local",
      marketplaceOrigin: "http://127.0.0.1:3000",
    });
    expect(resolveApplicationHref(registry, "solutions", "/facturation")).toBe(
      "/solutions/facturation",
    );
    expect(resolveApplicationHref(registry, "prospects", "/app")).toBe(
      "/app",
    );
    expect(resolveApplicationHref(registry, "facturation", "/app")).toBe(
      "/facturation/app",
    );
    expect(applicationIdForHostname("127.0.0.1:3000", registry)).toBeNull();
  });

  it("normalizes hosts and rejects unsafe destinations", () => {
    expect(normalizeApplicationHostname("EXAMPLE.COM.:443")).toBe(
      "example.com",
    );
    const registry = createApplicationRegistry({
      environment: "test",
      marketplaceOrigin: "http://localhost:3000",
    });
    expect(() =>
      resolveApplicationHref(registry, "solutions", "//evil.example"),
    ).toThrow(/local path/);
    expect(() =>
      resolveApplicationHref(
        registry,
        "facturation",
        "https://evil.example/steal-session",
      ),
    ).toThrow(/local path/);
  });

  it("fails closed when production hosts collide", () => {
    expect(() =>
      createApplicationRegistry({
        environment: "production",
        marketplaceOrigin: "https://shongre.fr",
        origins: { solutions: "https://shongre.fr" },
      }),
    ).toThrow(/distinct hosts/);
    expect(() =>
      createApplicationRegistry({
        environment: "production",
        marketplaceOrigin: "https://shongre.fr",
        origins: { prospects: "http://prospects.shongre.fr" },
      }),
    ).toThrow(/HTTPS/);
  });
});
