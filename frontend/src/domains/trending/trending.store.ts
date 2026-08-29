import { DEFAULT_TRENDING_ADMIN_CONFIG } from "./trending.defaults";
import type {
  TrendingAdminConfig,
  TrendingTopicOverride,
} from "./trending.types";
import { TRENDING_ADMIN_CONSTRAINTS } from "./trending.types";
import { storageService } from "../../services/storage.service";
import { DEFAULT_MARKET_CODE } from "../../configuration/market-baseline";

const STORAGE_KEY_PREFIX = "shongre_trending_admin_config_v1";

function storageKey(marketCode = DEFAULT_MARKET_CODE): string {
  return `${STORAGE_KEY_PREFIX}_${marketCode.trim().toUpperCase()}`;
}

function cloneConfig(config: TrendingAdminConfig): TrendingAdminConfig {
  return JSON.parse(JSON.stringify(config)) as TrendingAdminConfig;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function normalizeConfig(config: TrendingAdminConfig): TrendingAdminConfig {
  const minTopics = clamp(
    Math.floor(config.minTopics),
    TRENDING_ADMIN_CONSTRAINTS.topicCount.min,
    TRENDING_ADMIN_CONSTRAINTS.topicCount.max,
  );
  return {
    ...config,
    selectionMode: ["automatic", "manual", "hybrid"].includes(
      config.selectionMode,
    )
      ? config.selectionMode
      : DEFAULT_TRENDING_ADMIN_CONFIG.selectionMode,
    minTopics,
    maxTopics: clamp(
      Math.floor(config.maxTopics),
      minTopics,
      TRENDING_ADMIN_CONSTRAINTS.topicCount.max,
    ),
    listingsPerTopic: clamp(
      Math.floor(config.listingsPerTopic),
      TRENDING_ADMIN_CONSTRAINTS.listingsPerTopic.min,
      TRENDING_ADMIN_CONSTRAINTS.listingsPerTopic.max,
    ),
    maxTopicsPerParentCategory: clamp(
      Math.floor(config.maxTopicsPerParentCategory),
      TRENDING_ADMIN_CONSTRAINTS.topicCount.min,
      TRENDING_ADMIN_CONSTRAINTS.topicCount.max,
    ),
    minimumActivity: clamp(
      config.minimumActivity,
      TRENDING_ADMIN_CONSTRAINTS.minimumActivity.min,
      TRENDING_ADMIN_CONSTRAINTS.minimumActivity.max,
    ),
    displayPeriodDays: clamp(
      Math.floor(config.displayPeriodDays),
      TRENDING_ADMIN_CONSTRAINTS.displayPeriodDays.min,
      TRENDING_ADMIN_CONSTRAINTS.displayPeriodDays.max,
    ),
    cacheTtlMinutes: clamp(
      Math.floor(config.cacheTtlMinutes),
      TRENDING_ADMIN_CONSTRAINTS.cacheTtlMinutes.min,
      TRENDING_ADMIN_CONSTRAINTS.cacheTtlMinutes.max,
    ),
    title: config.title.slice(
      undefined,
      TRENDING_ADMIN_CONSTRAINTS.publicTitle.maxLength,
    ),
    subtitle: config.subtitle.slice(
      undefined,
      TRENDING_ADMIN_CONSTRAINTS.publicSubtitle.maxLength,
    ),
  };
}

export function getTrendingAdminConfig(
  marketCode = DEFAULT_MARKET_CODE,
): TrendingAdminConfig {
  const stored = storageService.get<Partial<TrendingAdminConfig> | null>(
    storageKey(marketCode),
    null,
  );
  return cloneConfig(
    normalizeConfig({
      ...DEFAULT_TRENDING_ADMIN_CONFIG,
      ...stored,
      weights: {
        ...DEFAULT_TRENDING_ADMIN_CONFIG.weights,
        ...(stored?.weights || {}),
      },
      overrides: stored?.overrides || DEFAULT_TRENDING_ADMIN_CONFIG.overrides,
    }),
  );
}

export function updateTrendingAdminConfig(
  updates: Partial<TrendingAdminConfig>,
  marketCode = DEFAULT_MARKET_CODE,
): TrendingAdminConfig {
  const current = getTrendingAdminConfig(marketCode);
  const next = cloneConfig(
    normalizeConfig({
      ...current,
      ...updates,
      weights: { ...current.weights, ...(updates.weights || {}) },
      updatedAt: new Date().toISOString(),
    }),
  );
  storageService.set(storageKey(marketCode), next);
  return next;
}

export function upsertTrendingOverride(
  input: TrendingTopicOverride,
): TrendingAdminConfig {
  const marketCode = input.marketCode || DEFAULT_MARKET_CODE;
  const current = getTrendingAdminConfig(marketCode);
  const overrides = current.overrides.filter(
    (override) => override.topicKey !== input.topicKey,
  );
  return updateTrendingAdminConfig(
    { overrides: [...overrides, { ...input, marketCode }] },
    marketCode,
  );
}
