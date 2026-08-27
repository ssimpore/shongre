import { afterEach, describe, expect, it, vi } from "vitest";
import { demoCrmProspectingService } from "../demo/demo-prospecting.service";
import { HttpCrmProspectingService } from "./http-crm-prospecting.service";
import { httpClient } from "./http-client";

describe("HttpCrmProspectingService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps profile and source collection envelopes", async () => {
    const profiles = await demoCrmProspectingService.listProfiles();
    const sources = await demoCrmProspectingService.listSources("FR");
    const get = vi
      .spyOn(httpClient, "get")
      .mockResolvedValueOnce({ items: profiles })
      .mockResolvedValueOnce({ items: sources });
    const service = new HttpCrmProspectingService();

    await expect(service.listProfiles()).resolves.toEqual(profiles);
    await expect(service.listSources("FR")).resolves.toEqual(sources);
    expect(get).toHaveBeenNthCalledWith(1, "/crm/prospecting/profiles");
    expect(get).toHaveBeenNthCalledWith(2, "/crm/prospecting/sources", {
      params: { marketCode: "FR" },
    });
  });

  it("uses the canonical discovery, brief, import and usage endpoints", async () => {
    const profiles = await demoCrmProspectingService.listProfiles();
    const discovery = await demoCrmProspectingService.discover({
      context: "SUBSCRIBER",
      idempotencyKey: "d5174ec1-a7ec-4e67-8bba-857f8f547f52",
      filters: {
        profileId: profiles[0]?.id,
        marketCode: "FR",
        countryCode: "FR",
        locale: "fr-FR",
        currency: "EUR",
        timezone: "Europe/Paris",
        industries: [],
        taxonomySlugs: [],
        companyTypes: [],
        sourceIds: [],
        freshness: [],
        limit: 25,
      },
    });
    const candidate = discovery.items[0];
    expect(candidate).toBeDefined();
    const brief = await demoCrmProspectingService.getOpportunityBrief(
      candidate.company.id,
    );
    const imported = await demoCrmProspectingService.importCandidate({
      companyId: candidate.company.id,
      expectedEvidenceIds: candidate.evidence.map((item) => item.id),
      reviewDecision: "APPROVED",
      idempotencyKey: "0dc15663-e63a-4440-9554-584666c44f1a",
    });
    const usage = await demoCrmProspectingService.getUsage("FR");
    const post = vi
      .spyOn(httpClient, "post")
      .mockResolvedValueOnce(discovery)
      .mockResolvedValueOnce(imported);
    const get = vi
      .spyOn(httpClient, "get")
      .mockResolvedValueOnce(brief)
      .mockResolvedValueOnce(usage);
    const service = new HttpCrmProspectingService();

    await expect(
      service.discover({
        context: "SUBSCRIBER",
        idempotencyKey: "d5174ec1-a7ec-4e67-8bba-857f8f547f52",
        filters: discovery.appliedFilters,
      }),
    ).resolves.toEqual(discovery);
    await expect(
      service.getOpportunityBrief(candidate.company.id),
    ).resolves.toEqual(brief);
    await expect(
      service.importCandidate({
        companyId: candidate.company.id,
        expectedEvidenceIds: candidate.evidence.map((item) => item.id),
        reviewDecision: "APPROVED",
        idempotencyKey: "0dc15663-e63a-4440-9554-584666c44f1a",
      }),
    ).resolves.toEqual(imported);
    await expect(service.getUsage("FR")).resolves.toEqual(usage);

    expect(post.mock.calls.map(([path]) => path)).toEqual([
      "/crm/prospecting/discover",
      "/crm/prospecting/imports",
    ]);
    expect(get).toHaveBeenNthCalledWith(
      1,
      `/crm/prospecting/candidates/${candidate.company.id}/brief`,
    );
    expect(get).toHaveBeenNthCalledWith(2, "/crm/prospecting/usage", {
      params: { marketCode: "FR" },
    });
  });

  it("rejects malformed backend responses instead of passing them to UI", async () => {
    vi.spyOn(httpClient, "get").mockResolvedValue({
      period: "not-a-period",
    });

    await expect(
      new HttpCrmProspectingService().getUsage("FR"),
    ).rejects.toMatchObject({ name: "ZodError" });
  });
});
