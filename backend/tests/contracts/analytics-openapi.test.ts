import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ANALYTICS_EVENT_NAMES } from "@shongre/contracts/analytics";

const document = JSON.parse(
  readFileSync(new URL("../../openapi/openapi.json", import.meta.url), "utf8"),
) as any;

describe("analytics OpenAPI contract", () => {
  it("keeps the wire event vocabulary synchronized with shared contracts", () => {
    expect(document.components.schemas.AnalyticsEventName.enum).toEqual([
      ...ANALYTICS_EVENT_NAMES,
    ]);
  });

  it("documents role-separated report permissions and public ingestion", () => {
    expect(document.paths["/analytics/events"].post["x-shongre-access"]).toBe(
      "public",
    );
    expect(
      document.paths["/analytics/overview"].get["x-shongre-permission"],
    ).toBe("analytics.platform.read");
    expect(
      document.paths["/analytics/acquisition"].get["x-shongre-permission"],
    ).toBe("analytics.marketing.read");
    expect(
      document.paths["/analytics/monetization"].get["x-shongre-permission"],
    ).toBe("analytics.finance.read");
    expect(
      document.paths["/analytics/providers"].get["x-shongre-permission"],
    ).toBe("analytics.technical.read");
    expect(
      document.paths["/analytics/sellers/{sellerId}"].get[
        "x-shongre-permission"
      ],
    ).toBe("store.analytics.read.own");
  });
});
