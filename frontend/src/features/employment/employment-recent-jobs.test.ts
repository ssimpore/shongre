import { beforeEach, describe, expect, it } from "vitest";
import { browserPreferencesService } from "../../services/browser-preferences.service";
import {
  employmentRecentJobsStorageKey,
  readRecentEmploymentJobIds,
  rememberRecentEmploymentJob,
  selectRecentEmploymentJobs,
} from "./employment-recent-jobs";

describe("employment recent jobs storage scope", () => {
  beforeEach(() => {
    for (const account of ["account-a", undefined]) {
      for (const market of ["FR", "BE"]) {
        browserPreferencesService.removeByKey(
          employmentRecentJobsStorageKey(account, market),
        );
      }
    }
  });

  it("separates accounts and markets", () => {
    expect(employmentRecentJobsStorageKey("account-a", "FR")).not.toBe(
      employmentRecentJobsStorageKey("account-a", "BE"),
    );
    expect(employmentRecentJobsStorageKey("account-a", "FR")).not.toBe(
      employmentRecentJobsStorageKey("account-b", "FR"),
    );
    expect(employmentRecentJobsStorageKey(undefined, "FR")).toBe(
      "shongre_employment_recent_jobs:guest:FR",
    );
  });

  it("remembers the latest view first, once, and bounded", () => {
    for (let index = 0; index < 14; index += 1) {
      rememberRecentEmploymentJob("account-a", "FR", `job-${index}`);
    }
    rememberRecentEmploymentJob("account-a", "FR", "job-5");
    const recent = readRecentEmploymentJobIds("account-a", "FR");
    expect(recent[0]).toBe("job-5");
    expect(recent).toHaveLength(12);
    expect(new Set(recent).size).toBe(recent.length);
    expect(readRecentEmploymentJobIds("account-a", "BE")).toEqual([]);
    expect(readRecentEmploymentJobIds(undefined, "FR")).toEqual([]);
  });

  it("ignores a corrupted stored value", () => {
    browserPreferencesService.setByKey(
      employmentRecentJobsStorageKey("account-a", "FR"),
      { not: "a list" },
    );
    expect(readRecentEmploymentJobIds("account-a", "FR")).toEqual([]);
  });

  it("selects from one existing search projection in recent-view order", () => {
    const searchItems = [
      { id: "job-a", title: "A" },
      { id: "job-b", title: "B" },
      { id: "job-c", title: "C" },
    ];

    expect(
      selectRecentEmploymentJobs(
        ["job-c", "missing", "job-a", "job-c"],
        searchItems,
      ),
    ).toEqual([searchItems[2], searchItems[0]]);
  });
});
