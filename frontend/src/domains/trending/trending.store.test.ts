import { afterEach, describe, expect, it } from "vitest";
import { storageService } from "../../services/storage.service";
import {
  getTrendingAdminConfig,
  updateTrendingAdminConfig,
} from "./trending.store";
import { TRENDING_ADMIN_CONSTRAINTS } from "./trending.types";

const MARKET_CODE = "ZZ";
const STORAGE_KEY = `shongre_trending_admin_config_v1_${MARKET_CODE}`;

afterEach(() => storageService.remove(STORAGE_KEY));

describe("trending admin configuration", () => {
  it("normalizes persisted values through the shared constraints", () => {
    const saved = updateTrendingAdminConfig(
      {
        minTopics: -4,
        maxTopics: 999,
        maxTopicsPerParentCategory: 999,
        minimumActivity: 4,
        displayPeriodDays: 999,
        cacheTtlMinutes: -1,
        title: "T".repeat(TRENDING_ADMIN_CONSTRAINTS.publicTitle.maxLength + 1),
        subtitle: "S".repeat(
          TRENDING_ADMIN_CONSTRAINTS.publicSubtitle.maxLength + 1,
        ),
      },
      MARKET_CODE,
    );

    expect(saved.minTopics).toBe(TRENDING_ADMIN_CONSTRAINTS.topicCount.min);
    expect(saved.maxTopics).toBe(TRENDING_ADMIN_CONSTRAINTS.topicCount.max);
    expect(saved.maxTopicsPerParentCategory).toBe(
      TRENDING_ADMIN_CONSTRAINTS.topicCount.max,
    );
    expect(saved.minimumActivity).toBe(
      TRENDING_ADMIN_CONSTRAINTS.minimumActivity.max,
    );
    expect(saved.displayPeriodDays).toBe(
      TRENDING_ADMIN_CONSTRAINTS.displayPeriodDays.max,
    );
    expect(saved.cacheTtlMinutes).toBe(
      TRENDING_ADMIN_CONSTRAINTS.cacheTtlMinutes.min,
    );
    expect(saved.title).toHaveLength(
      TRENDING_ADMIN_CONSTRAINTS.publicTitle.maxLength,
    );
    expect(saved.subtitle).toHaveLength(
      TRENDING_ADMIN_CONSTRAINTS.publicSubtitle.maxLength,
    );
    expect(getTrendingAdminConfig(MARKET_CODE)).toEqual(saved);
  });
});
