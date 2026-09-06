import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpCoursesService } from "./http-courses.service";
import { HttpDeliveryService } from "./http-delivery.service";
import { HttpEmploymentService } from "./http-employment.service";
import { httpClient } from "./http-client";

afterEach(() => vi.restoreAllMocks());

describe("HTTP vertical favorite market boundaries", () => {
  it("uses explicit market-scoped desired state for Education favorites", async () => {
    const get = vi
      .spyOn(httpClient, "get")
      .mockResolvedValue({ tutorProfileIds: ["tutor-1"] });
    const put = vi
      .spyOn(httpClient, "put")
      .mockResolvedValue({ isFavorite: true });
    const service = new HttpCoursesService();

    await expect(service.getSavedTutorIds("ignored", "BE")).resolves.toEqual([
      "tutor-1",
    ]);
    await expect(
      service.setSavedTutor("ignored", "tutor-1", "BE", true),
    ).resolves.toBe(true);

    expect(get).toHaveBeenCalledWith("/education/favorites", {
      headers: { "X-Shongre-Market": "BE" },
    });
    expect(put).toHaveBeenCalledWith(
      "/education/tutors/tutor-1/favorite",
      { isFavorite: true },
      { headers: { "X-Shongre-Market": "BE" } },
    );
  });

  it("uses explicit market-scoped desired state for Employment favorites", async () => {
    const get = vi
      .spyOn(httpClient, "get")
      .mockImplementation(async (path) =>
        path === "/employment/favorites"
          ? { jobIds: ["job-1"] }
          : ({ savedJobs: [] } as never),
      );
    const put = vi
      .spyOn(httpClient, "put")
      .mockResolvedValue({ isFavorite: false });
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

    expect(get).toHaveBeenCalledWith("/employment/candidate/workspace", {
      headers: { "X-Shongre-Market": "BE" },
    });
    expect(get).toHaveBeenCalledWith("/employment/favorites", {
      headers: { "X-Shongre-Market": "BE" },
    });
    expect(get).toHaveBeenCalledWith("/employment/jobs/job-1", {
      headers: { "X-Shongre-Market": "BE" },
    });
    expect(get).toHaveBeenCalledWith("/employment/jobs/job-1/similar", {
      headers: { "X-Shongre-Market": "BE" },
    });
    expect(put).toHaveBeenCalledWith(
      "/employment/jobs/job-1/save",
      { isFavorite: false },
      { headers: { "X-Shongre-Market": "BE" } },
    );
  });

  it("uses explicit market-scoped desired state for Delivery favorites", async () => {
    const get = vi
      .spyOn(httpClient, "get")
      .mockResolvedValue({ requestIds: ["request-1"] });
    const put = vi
      .spyOn(httpClient, "put")
      .mockResolvedValue({ isFavorite: true });
    const service = new HttpDeliveryService();

    await expect(
      service.getFavoriteRequestIds("ignored", "CH"),
    ).resolves.toEqual(["request-1"]);
    await expect(
      service.setFavoriteRequest("ignored", "request-1", "CH", true),
    ).resolves.toBe(true);

    expect(get).toHaveBeenCalledWith("/delivery/favorites", {
      headers: { "X-Shongre-Market": "CH" },
    });
    expect(put).toHaveBeenCalledWith(
      "/delivery/requests/request-1/favorite",
      { isFavorite: true },
      { headers: { "X-Shongre-Market": "CH" } },
    );
  });
});
