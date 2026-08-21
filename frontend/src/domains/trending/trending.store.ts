import { DEFAULT_TRENDING_ADMIN_CONFIG } from "./trending.defaults";
import type {
  TrendingAdminConfig,
  TrendingTopicOverride,
} from "./trending.types";
import { storageService } from "../../services/storage.service";

const STORAGE_KEY_PREFIX = "shongre_trending_admin_config_v1";

function storageKey(marketCode = "FR"): string {
  return `${STORAGE_KEY_PREFIX}_${marketCode.trim().toUpperCase()}`;
}

function cloneConfig(config: TrendingAdminConfig): TrendingAdminConfig {
  return JSON.parse(JSON.stringify(config)) as TrendingAdminConfig;
}

export function getTrendingAdminConfig(marketCode = "FR"): TrendingAdminConfig {
  const stored = storageService.get<Partial<TrendingAdminConfig> | null>(
    storageKey(marketCode),
    null,
  );
  return cloneConfig({
    ...DEFAULT_TRENDING_ADMIN_CONFIG,
    ...stored,
    weights: {
      ...DEFAULT_TRENDING_ADMIN_CONFIG.weights,
      ...(stored?.weights || {}),
    },
    overrides: stored?.overrides || DEFAULT_TRENDING_ADMIN_CONFIG.overrides,
  });
}

export function updateTrendingAdminConfig(
  updates: Partial<TrendingAdminConfig>,
  marketCode = "FR",
): TrendingAdminConfig {
  const current = getTrendingAdminConfig(marketCode);
  const next = cloneConfig({
    ...current,
    ...updates,
    weights: { ...current.weights, ...(updates.weights || {}) },
    updatedAt: new Date().toISOString(),
  });
  storageService.set(storageKey(marketCode), next);
  return next;
}

export function upsertTrendingOverride(
  input: TrendingTopicOverride,
): TrendingAdminConfig {
  const marketCode = input.marketCode || "FR";
  const current = getTrendingAdminConfig(marketCode);
  const overrides = current.overrides.filter(
    (override) => override.topicKey !== input.topicKey,
  );
  return updateTrendingAdminConfig(
    { overrides: [...overrides, { ...input, marketCode }] },
    marketCode,
  );
}
