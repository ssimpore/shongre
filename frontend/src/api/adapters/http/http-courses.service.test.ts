import { afterEach, expect, it, vi } from "vitest";
import { HttpCoursesService } from "./http-courses.service";
import { httpClient } from "./http-client";

afterEach(() => vi.restoreAllMocks());

it("keeps tutor writes and deletion in their explicit market after another market read", async () => {
  const request = vi
    .spyOn(httpClient, "request")
    .mockResolvedValue({ subjectIds: ["mathematics"], levelIds: ["primary"] });
  const service = new HttpCoursesService();
  const draft = await service.getTutorOnboardingDraft("SN");
  await service.getTutorOnboardingDraft("FR");
  await service.saveTutorOnboardingDraft("SN", draft);
  expect(request.mock.calls[2]?.[1]?.body).toBe(
    JSON.stringify({ marketCode: "SN", draft }),
  );
  await service.clearTutorOnboardingDraft("SN");
  expect(request.mock.calls[3]?.[0]).toContain("market=SN");
});

it("keeps learner writes and deletion in their explicit market after another market read", async () => {
  const request = vi
    .spyOn(httpClient, "request")
    .mockResolvedValue({ subjectId: "mathematics", levelId: "primary" });
  const service = new HttpCoursesService();
  const draft = await service.getLearnerRequestDraft("SN");
  await service.getLearnerRequestDraft("FR");
  await service.saveLearnerRequestDraft("SN", draft);
  expect(request.mock.calls[2]?.[1]?.body).toBe(
    JSON.stringify({ marketCode: "SN", draft }),
  );
  await service.clearLearnerRequestDraft("SN");
  expect(request.mock.calls[3]?.[0]).toContain("market=SN");
});
