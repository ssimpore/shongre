import { describe, it, expect } from "vitest";
import { prospectResearchService } from "./prospect-research.service";

describe("ProspectResearchService", () => {
  it("returns relevant furniture prospects on furniture queries", async () => {
    const result = await prospectResearchService.searchProspects({
      naturalLanguageQuery: "Boutiques de mobilier design à Paris",
    });

    expect(result.candidates.length).toBeGreaterThan(0);
    const first = result.candidates[0];
    expect(first.company.name).toContain("Maison Déco");
    expect(first.fit.score).toBeGreaterThan(80);
    expect(first.sources.length).toBeGreaterThan(0);
  });

  it("returns EV mobility prospects on vehicle/energy queries", async () => {
    const result = await prospectResearchService.searchProspects({
      naturalLanguageQuery: "Installateurs bornes de recharge et énergie",
    });

    expect(result.candidates.length).toBeGreaterThan(0);
    const first = result.candidates[0];
    expect(first.company.name).toContain("VoltExpert");
    expect(first.fit.score).toBeGreaterThan(90);
  });

  it("enriches company data with verified source citations", async () => {
    const diff = await prospectResearchService.enrichCompany("crm-comp-1");
    expect(diff.suggestedIndustry).toBeDefined();
    expect(diff.sources.length).toBeGreaterThan(0);
    expect(diff.sources[0].url).toContain("atelier-nordique");
  });
});
