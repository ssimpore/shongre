import { describe, expect, it } from "vitest";
import {
  employmentRecentJobsStorageKey,
  selectRecentEmploymentJobs,
} from "./employment-recent-jobs";

describe("employment recent jobs storage scope", () => {
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
