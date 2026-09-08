import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpCoursesService } from "./http-courses.service";
import { HttpDeliveryService } from "./http-delivery.service";
import { HttpEmploymentService } from "./http-employment.service";
import { apiOperation } from "./generated-api-operation";

vi.mock("./generated-api-operation", () => ({ apiOperation: vi.fn() }));

afterEach(() => vi.mocked(apiOperation).mockReset());

describe("HTTP vertical favorite market boundaries", () => {
  it("uses explicit market-scoped desired state for Education favorites", async () => {
    vi.mocked(apiOperation)
      .mockResolvedValueOnce({ tutorProfileIds: ["tutor-1"] })
      .mockResolvedValueOnce({ isFavorite: true });
    const service = new HttpCoursesService();

    await expect(service.getSavedTutorIds("ignored", "BE")).resolves.toEqual([
      "tutor-1",
    ]);
    await expect(
      service.setSavedTutor("ignored", "tutor-1", "BE", true),
    ).resolves.toBe(true);

    expect(apiOperation).toHaveBeenNthCalledWith(1, "getEducationFavorites", {
      headers: { "X-Shongre-Market": "BE" },
    });
    expect(apiOperation).toHaveBeenNthCalledWith(
      2,
      "putEducationTutorsByIdFavorite",
      {
        path: { id: "tutor-1" },
        body: { isFavorite: true },
        headers: { "X-Shongre-Market": "BE" },
      },
    );
  });

  it("uses explicit market-scoped desired state for Employment favorites", async () => {
    vi.mocked(apiOperation).mockImplementation(async (operationId) =>
      operationId === "getEmploymentFavorites"
        ? { jobIds: ["job-1"] }
        : operationId === "putEmploymentJobsByIdSave"
          ? { isFavorite: false }
          : ({ savedJobs: [] } as never),
    );
    const service = new HttpEmploymentService();

    await service.getCandidateWorkspace("BE");
    await service.getJob("job-1", "BE");
    await service.getSimilarJobs("job-1", "BE");
    await expect(service.getSavedJobIds("ignored", "BE")).resolves.toEqual([
      "job-1",
    ]);
    await expect(
      service.setSavedJob("ignored", "job-1", "BE", false),
    ).resolves.toBe(false);

    expect(apiOperation).toHaveBeenCalledWith(
      "getEmploymentCandidateWorkspace",
      { headers: { "X-Shongre-Market": "BE" } },
    );
    expect(apiOperation).toHaveBeenCalledWith("getEmploymentFavorites", {
      headers: { "X-Shongre-Market": "BE" },
    });
    expect(apiOperation).toHaveBeenCalledWith("getEmploymentJobsById", {
      path: { id: "job-1" },
      headers: { "X-Shongre-Market": "BE" },
    });
    expect(apiOperation).toHaveBeenCalledWith("getEmploymentJobsByIdSimilar", {
      path: { id: "job-1" },
      headers: { "X-Shongre-Market": "BE" },
    });
    expect(apiOperation).toHaveBeenCalledWith("putEmploymentJobsByIdSave", {
      path: { id: "job-1" },
      body: { isFavorite: false },
      headers: { "X-Shongre-Market": "BE" },
    });
  });

  it("uses explicit market-scoped desired state for Delivery favorites", async () => {
    vi.mocked(apiOperation)
      .mockResolvedValueOnce({ requestIds: ["request-1"] })
      .mockResolvedValueOnce({ isFavorite: true });
    const service = new HttpDeliveryService();

    await expect(
      service.getFavoriteRequestIds("ignored", "CH"),
    ).resolves.toEqual(["request-1"]);
    await expect(
      service.setFavoriteRequest("ignored", "request-1", "CH", true),
    ).resolves.toBe(true);

    expect(apiOperation).toHaveBeenNthCalledWith(1, "getDeliveryFavorites", {
      headers: { "X-Shongre-Market": "CH" },
    });
    expect(apiOperation).toHaveBeenNthCalledWith(
      2,
      "putDeliveryRequestFavorite",
      {
        path: { requestId: "request-1" },
        body: { isFavorite: true },
        headers: { "X-Shongre-Market": "CH" },
      },
    );
  });
});
