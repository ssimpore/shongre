import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpCrmProspectingService } from "./http-crm-prospecting.service";
import { apiOperation } from "./generated-api-operation";

vi.mock("./generated-api-operation", () => ({ apiOperation: vi.fn() }));

describe("HttpCrmProspectingService", () => {
  beforeEach(() => vi.mocked(apiOperation).mockReset());

  it("uses generated operations for profile and source collections", async () => {
    vi.mocked(apiOperation)
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [] });
    const service = new HttpCrmProspectingService();

    await expect(service.listProfiles()).resolves.toEqual([]);
    await expect(service.listSources("FR")).resolves.toEqual([]);
    expect(apiOperation).toHaveBeenNthCalledWith(
      1,
      "listProspectingProfiles",
      {},
    );
    expect(apiOperation).toHaveBeenNthCalledWith(2, "listProspectingSources", {
      query: { marketCode: "FR" },
    });
  });

  it("rejects malformed backend responses instead of passing them to UI", async () => {
    vi.mocked(apiOperation).mockResolvedValue({ period: "not-a-period" });

    await expect(
      new HttpCrmProspectingService().getUsage("FR"),
    ).rejects.toMatchObject({ name: "ZodError" });
  });
});
