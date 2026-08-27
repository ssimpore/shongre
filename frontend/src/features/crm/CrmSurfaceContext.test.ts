import { describe, expect, it } from "vitest";
import { prospectsPaths } from "./CrmSurfaceContext";

describe("product-facing CRM paths", () => {
  it("keeps the complete Prospects CRM on one canonical route family", () => {
    expect(prospectsPaths).toMatchObject({
      kind: "prospects",
      overview: "/app",
      discover: "/app/discover",
      companies: "/app/companies",
      contacts: "/app/contacts",
      lists: "/app/lists",
      pipeline: "/app/pipeline",
      tasks: "/app/tasks",
      activities: "/app/activities",
      campaigns: "/app/campaigns",
      analytics: "/app/analytics",
      sources: "/app/sources",
      team: "/app/team",
      billing: "/app/billing",
      settings: "/app/settings",
    });
  });

  it("encodes entity identifiers in detail routes", () => {
    expect(prospectsPaths.company("company/with spaces")).toBe(
      "/app/companies/company%2Fwith%20spaces",
    );
    expect(prospectsPaths.contact("contact#1")).toBe(
      "/app/contacts/contact%231",
    );
    expect(prospectsPaths.opportunity("opportunity?1")).toBe(
      "/app/opportunities/opportunity%3F1",
    );
  });
});
