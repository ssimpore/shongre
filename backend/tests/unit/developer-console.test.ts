import { describe, expect, it } from "vitest";
import {
  CAPABILITIES,
  isStaffCapability,
} from "@shongre/contracts/access-control";
import specification from "../../openapi/openapi.json" with { type: "json" };
import {
  API_DOMAINS,
  accessLevelFor,
  buildConsoleContract,
  domainAccessLabel,
  domainForTag,
  type ApiSpecification,
} from "../../src/infrastructure/http/developer-console-model.js";
import {
  escapeHtml,
  renderDeveloperConsole,
  type DeveloperConsoleRuntime,
} from "../../src/infrastructure/http/developer-console.js";
import { renderApiDocumentation } from "../../src/infrastructure/http/openapi-documentation.js";

const contract = buildConsoleContract(
  specification as unknown as ApiSpecification,
);

const runtime: DeveloperConsoleRuntime = {
  environment: "local",
  environmentLabel: "Local",
  apiOrigin: "http://127.0.0.1:4000",
  apiPrefix: "/api/v1",
  apiBaseUrl: "http://127.0.0.1:4000/api/v1",
  serviceVersion: "1.0.0",
  applicationUrls: {
    marketplace: "http://127.0.0.1:3000",
    solutions: "http://127.0.0.1:3000/solutions",
    prospects: "http://127.0.0.1:3000/prospects",
    facturation: "http://127.0.0.1:3000/facturation",
  },
  marketplaceUrl: "http://127.0.0.1:3000",
  requestDeadlineMs: 15_000,
};

describe("developer console contract model", () => {
  it("assigns every documented tag to exactly one presentation domain", () => {
    const assigned = new Map<string, string>();
    for (const domain of API_DOMAINS) {
      for (const tag of domain.tags) {
        expect(assigned.has(tag)).toBe(false);
        assigned.set(tag, domain.id);
      }
    }
    const documentedTags = new Set<string>();
    for (const item of Object.values(specification.paths)) {
      for (const [method, operation] of Object.entries(
        item as Record<string, { tags?: string[] }>,
      )) {
        if (method === "parameters" || !operation?.tags) continue;
        for (const tag of operation.tags) documentedTags.add(tag);
      }
    }
    const unassigned = [...documentedTags].filter(
      (tag) => !assigned.has(tag) && !tag.startsWith("admin-"),
    );
    expect(unassigned).toEqual([]);
    expect(domainForTag("admin-audit-logs")).toBe("administration");
    expect(domainForTag("listings")).toBe("listings");
  });

  it("derives access levels from the contract's own metadata", () => {
    expect(accessLevelFor({ "x-shongre-access": "public" })).toBe("public");
    expect(accessLevelFor({ "x-shongre-access": "authenticated" })).toBe(
      "authenticated",
    );
    const staffCapability = CAPABILITIES.find(isStaffCapability);
    expect(staffCapability).toBeDefined();
    expect(
      accessLevelFor({
        "x-shongre-access": "permission",
        "x-shongre-permission": staffCapability,
      }),
    ).toBe("staff");
    const customerCapability = CAPABILITIES.find(
      (capability) => !isStaffCapability(capability),
    );
    expect(
      accessLevelFor({
        "x-shongre-access": "permission",
        "x-shongre-permission": customerCapability,
      }),
    ).toBe("authenticated");
    // An unrecognised permission must never widen into a public listing.
    expect(
      accessLevelFor({
        "x-shongre-access": "permission",
        "x-shongre-permission": "not.a.capability",
      }),
    ).toBe("authenticated");
  });

  it("keeps every documented operation, its access level and its request path", () => {
    expect(contract.operations.length).toBeGreaterThan(500);
    const listings = contract.operations.find(
      (operation) => operation.operationId === "getListings",
    );
    expect(listings).toMatchObject({
      method: "GET",
      requestPath: "/api/v1/listings",
      access: "public",
      domainId: "listings",
      purpose: "Public listings feed",
    });
    const liveness = contract.operations.find(
      (operation) => operation.operationId === "getLiveness",
    );
    // Operational probes answer on the origin root, not under the prefix.
    expect(liveness?.requestPath).toBe("/livez");
    const adminStats = contract.operations.find(
      (operation) => operation.operationId === "getAdminStats",
    );
    expect(adminStats?.access).toBe("staff");
    expect(contract.operations.every((operation) => operation.purpose)).toBe(
      true,
    );
  });

  it("promotes the essential operations in reading order", () => {
    expect(
      contract.essentialOperations.map((operation) => operation.requestPath),
    ).toEqual([
      "/livez",
      "/readyz",
      "/api/v1/taxonomy/v1/root",
      "/api/v1/listings",
      "/api/v1/markets",
      "/api/v1/business-rules/catalog",
      "/api/v1/admin/stats",
    ]);
  });

  it("only offers public, parameter-free GET operations in the playground", () => {
    expect(contract.playgroundOperations.length).toBeGreaterThan(0);
    for (const operation of contract.playgroundOperations) {
      expect(operation.method).toBe("GET");
      expect(operation.access).toBe("public");
      expect(operation.requestPath).not.toContain("{");
      for (const parameter of operation.parameters) {
        expect(["query", "header"]).toContain(parameter.location);
      }
    }
    const listings = contract.playgroundOperations.find(
      (operation) => operation.operationId === "getListings",
    );
    expect(listings?.parameters.map((parameter) => parameter.name)).toContain(
      "X-Shongre-Market",
    );
  });

  it("summarizes a domain's access mix without hiding staff operations", () => {
    expect(domainAccessLabel(["public"])).toBe("Public");
    expect(domainAccessLabel(["public", "authenticated"])).toBe(
      "Public + authenticated",
    );
    expect(domainAccessLabel(["authenticated", "staff"])).toBe(
      "Staff and authenticated",
    );
    expect(domainAccessLabel(["public", "authenticated", "staff"])).toBe(
      "Mixed access",
    );
    expect(domainAccessLabel([])).toBe("No documented operation");
  });

  it("reports the contract's deprecations rather than inventing a release feed", () => {
    expect(contract.deprecations).toEqual([]);
    const deprecated = buildConsoleContract({
      info: { version: "9.9.9" },
      paths: {
        "/legacy": {
          get: {
            operationId: "getLegacy",
            tags: ["listings"],
            summary: "Legacy read",
            deprecated: true,
            "x-sunset-at": "2027-01-01",
            "x-shongre-access": "public",
          },
        },
      },
    });
    expect(deprecated.deprecations).toEqual([
      {
        operationId: "getLegacy",
        method: "GET",
        requestPath: "/api/v1/legacy",
        sunsetAt: "2027-01-01",
      },
    ]);
  });
});

describe("developer console document", () => {
  const html = renderDeveloperConsole(runtime, contract);

  it("escapes untrusted text and keeps the contract island parseable", () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    );
    const island = html.match(
      /<script id="console-contract" type="application\/json">([^]*?)<\/script>/,
    );
    expect(island).not.toBeNull();
    expect(island![1]).not.toContain("<");
    const parsed = JSON.parse(island![1]) as {
      operations: string[][];
      playground: { requestPath: string }[];
      origin: string;
    };
    expect(parsed.origin).toBe(runtime.apiOrigin);
    expect(parsed.operations.length).toBe(contract.operations.length);
    expect(
      parsed.playground.every((operation) =>
        operation.requestPath.startsWith("/"),
      ),
    ).toBe(true);
  });

  it("shows the configured environment, base URL and contract version", () => {
    expect(html).toContain("http://127.0.0.1:4000/api/v1");
    expect(html).toContain("Local environment");
    expect(html).toContain(contract.contractVersion);
    // Only the configured environment is offered; there is no switcher.
    expect(html).not.toContain("Production environment");
  });

  it("resolves every application through its configured origin", () => {
    for (const url of Object.values(runtime.applicationUrls)) {
      expect(html).toContain(url as string);
    }
    const unconfigured = renderDeveloperConsole(
      {
        ...runtime,
        applicationUrls: {
          marketplace: "https://shongre.test",
          solutions: null,
          prospects: null,
          facturation: null,
        },
        marketplaceUrl: "https://shongre.test",
      },
      contract,
    );
    expect(unconfigured).toContain(
      "Origin not configured in this environment.",
    );
    expect(unconfigured).not.toContain("127.0.0.1:3000");
  });

  it("degrades safely when no Web origin is configured", () => {
    const headless = renderDeveloperConsole(
      {
        ...runtime,
        applicationUrls: {
          marketplace: null,
          solutions: null,
          prospects: null,
          facturation: null,
        },
        marketplaceUrl: null,
      },
      contract,
    );
    expect(headless).toContain("Sign-in origin not configured");
    expect(headless).not.toContain("/connexion");
    expect(headless).not.toContain('href="https://shongre.test/admin"');
  });

  it("marks restricted operations without publishing privileged detail", () => {
    expect(html).toContain("Staff only");
    expect(html).toContain("Restricted");
    // Permission identifiers and worker internals stay out of the public page.
    expect(html).not.toContain("admin.configuration.manage");
    expect(html).toContain(
      "deliberately absent from the public readiness projection",
    );
  });

  it("states that platform-wide telemetry is not published", () => {
    expect(html).toContain(
      "does not publish platform-wide traffic aggregates on a public endpoint",
    );
    expect(html).toContain("Awaiting the first request");
    // The reference design's illustrative figures must not ship as facts.
    expect(html).not.toContain("12,480");
    expect(html).not.toContain("99.98%");
  });

  it("gives every navigation item a resolvable destination", () => {
    const hrefs = [...html.matchAll(/<a [^>]*class="nav-link"[^>]*>/g)].map(
      (match) => /href="([^"]+)"/.exec(match[0])?.[1],
    );
    expect(hrefs.length).toBe(11);
    for (const href of hrefs) {
      expect(href).toBeDefined();
      expect(href).not.toBe("#");
      if (href!.startsWith("#")) {
        expect(html).toContain(`id="${href!.slice(1)}"`);
      } else {
        expect(href).toMatch(/^(\/|https?:\/\/)/);
      }
    }
  });

  it("embeds the active brand artwork exactly once", () => {
    const marks = html.match(/data:image\/png;base64,/g) || [];
    expect(marks.length).toBe(1);
    expect(html).toContain('<use href="#brand-signature" />');
  });
});

describe("API reference document", () => {
  it("anchors every domain the console links to", async () => {
    const reference = await renderApiDocumentation();
    for (const domain of API_DOMAINS) {
      expect(reference).toContain(`id="domain-${domain.id}"`);
    }
    expect(reference).toContain("getListings");
    expect(reference).not.toContain("<script");
  });
});
