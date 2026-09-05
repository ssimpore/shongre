import { describe, expect, it, vi } from "vitest";
import { AdminService } from "../../src/modules/admin/admin.service.js";

const REQUEST_ID = "418711cb-aee0-4fa3-a102-8ec6ea2a2cb8";

function serviceForRequester(requesterId: string) {
  const createReport = vi.fn().mockResolvedValue({ id: "report-1" });
  const createCaseForReport = vi.fn().mockResolvedValue(undefined);
  const service = new AdminService(
    { createReport } as never,
    {} as never,
    { createCaseForReport } as never,
    {} as never,
    {
      getRequest: vi.fn().mockResolvedValue({
        id: REQUEST_ID,
        requesterId,
      }),
    } as never,
  );
  return { service, createReport, createCaseForReport };
}

describe("delivery moderation integration", () => {
  it("creates a canonical moderation case for a delivery report", async () => {
    const { service, createReport, createCaseForReport } =
      serviceForRequester("request-owner");

    await expect(
      service.submitReport({
        reporterId: "reporter",
        deliveryRequestId: REQUEST_ID,
        reason: "prohibited",
        details: "Le colis semble relever d’une catégorie interdite.",
      }),
    ).resolves.toEqual({ id: "report-1", status: "pending" });

    expect(createReport).toHaveBeenCalledWith(
      expect.objectContaining({ deliveryRequestId: REQUEST_ID }),
    );
    expect(createCaseForReport).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryRequestId: REQUEST_ID,
        affectedUserId: "request-owner",
        category: "prohibited",
      }),
    );
  });

  it("does not allow a requester to report their own delivery request", async () => {
    const { service, createReport } = serviceForRequester("reporter");

    await expect(
      service.submitReport({
        reporterId: "reporter",
        deliveryRequestId: REQUEST_ID,
        reason: "other",
        details: "Ce signalement vise une demande appartenant au demandeur.",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(createReport).not.toHaveBeenCalled();
  });
});
