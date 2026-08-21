import {
  Market,
  MarketConfiguration,
  SettingResolution,
  MarketInheritanceMetrics,
} from "./market.types";
import { FR_CANONICAL_CONFIG } from "./market.defaults";

/**
 * Checks if a value is a plain JavaScript object (and not null, array, date, regex, etc.)
 */
function isPlainObject(item: any): item is Record<string, any> {
  return (
    item !== null &&
    typeof item === "object" &&
    !Array.isArray(item) &&
    !(item instanceof Date) &&
    !(item instanceof RegExp)
  );
}

/**
 * Deep clones any serializable data structure
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as unknown as T;
  }
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj as any)) {
    result[key] = deepClone((obj as any)[key]);
  }
  return result as T;
}

/**
 * Deeply merges overrides onto a base object while strictly respecting
 * explicit values (including false, 0, empty string, and empty arrays).
 * Only `undefined` values are ignored/inherited.
 */
export function deepMergeOverrides<T extends Record<string, any>>(
  base: T,
  overrides?: Record<string, any> | null,
): T {
  if (!overrides || typeof overrides !== "object") {
    return deepClone(base);
  }

  const result = deepClone(base);

  for (const key of Object.keys(overrides)) {
    const overrideValue = overrides[key];

    // If undefined, do NOT override (inherit baseline)
    if (overrideValue === undefined) {
      continue;
    }

    const baseValue = result[key];

    // If both base and override are plain objects, recursively merge
    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      (result as any)[key] = deepMergeOverrides(baseValue, overrideValue);
    } else {
      // Direct override (including false, 0, "", [], null)
      (result as any)[key] = deepClone(overrideValue);
    }
  }

  return result;
}

/**
 * Retrieves a nested value by dot-path (e.g. 'payments.buyerProtectionFixedFee')
 */
export function getNestedValue(obj: any, path: string): any {
  if (!obj || typeof obj !== "object" || !path) return undefined;
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

/**
 * Sets a nested value on an object by dot-path
 */
export function setNestedValue(
  obj: Record<string, any>,
  path: string,
  value: any,
): void {
  const parts = path.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * Deletes a nested key by dot-path
 */
export function deleteNestedValue(
  obj: Record<string, any>,
  path: string,
): boolean {
  if (!obj || typeof obj !== "object" || !path) return false;
  const parts = path.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== "object") {
      return false;
    }
    current = current[part];
  }
  const lastKey = parts[parts.length - 1];
  if (lastKey in current) {
    delete current[lastKey];
    return true;
  }
  return false;
}

/**
 * Central Dynamic Inheritance Resolver Engine
 */
export class MarketResolver {
  /**
   * Resolves the complete effective MarketConfiguration for a given market.
   * Logic: FR_CANONICAL_CONFIG + FR.overrides (if any) + Market.overrides
   */
  public resolveEffectiveConfig(
    market: Market,
    franceMarket?: Market | null,
  ): MarketConfiguration {
    // 1. Resolve France baseline configuration
    const frOverrides =
      franceMarket?.overrides || (market.isDefault ? market.overrides : {});
    const effectiveFrance = deepMergeOverrides(
      FR_CANONICAL_CONFIG,
      frOverrides,
    );

    // 2. If the requested market is France itself, return effective France
    if (market.code === "FR" || market.isDefault) {
      return effectiveFrance;
    }

    // 3. For any other market: merge its overrides on top of effective France
    return deepMergeOverrides(effectiveFrance, market.overrides);
  }

  /**
   * Resolves a single setting with full provenance metadata.
   */
  public resolveSetting<T = any>(
    market: Market,
    franceMarket: Market | null,
    path: string,
  ): SettingResolution<T> {
    const frOverrides =
      franceMarket?.overrides || (market.isDefault ? market.overrides : {});
    const effectiveFrance = deepMergeOverrides(
      FR_CANONICAL_CONFIG,
      frOverrides,
    );
    const frenchValue = getNestedValue(effectiveFrance, path);

    // If market is France itself
    if (market.code === "FR" || market.isDefault) {
      const frSpecificOverride = getNestedValue(market.overrides, path);
      const isOverridden = frSpecificOverride !== undefined;
      return {
        value: (isOverridden ? frSpecificOverride : frenchValue) as T,
        source: "FR",
        sourceMarketCode: "FR",
        isInherited: false,
        overrideDefined: isOverridden,
        frenchReferenceValue: frenchValue,
      };
    }

    // Check if target market defines an explicit override
    const localOverride = getNestedValue(market.overrides, path);
    const hasLocalOverride = localOverride !== undefined;

    if (hasLocalOverride) {
      return {
        value: localOverride as T,
        source: "LOCAL",
        sourceMarketCode: market.code,
        isInherited: false,
        overrideDefined: true,
        frenchReferenceValue: frenchValue,
      };
    }

    // Dynamic inheritance from France
    return {
      value: frenchValue as T,
      source: "FR",
      sourceMarketCode: "FR",
      isInherited: true,
      overrideDefined: false,
      frenchReferenceValue: frenchValue,
    };
  }

  /**
   * Counts total leaf fields in an object
   */
  private countLeafFields(obj: Record<string, any>, prefix = ""): string[] {
    const paths: string[] = [];
    for (const key of Object.keys(obj)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      const val = obj[key];
      if (isPlainObject(val)) {
        paths.push(...this.countLeafFields(val, currentPath));
      } else {
        paths.push(currentPath);
      }
    }
    return paths;
  }

  /**
   * Calculates inheritance percentage and breakdown metrics for a market.
   */
  public getInheritanceMetrics(
    market: Market,
    franceMarket?: Market | null,
  ): MarketInheritanceMetrics {
    const allPaths = this.countLeafFields(FR_CANONICAL_CONFIG);
    const totalFieldsCount = allPaths.length;

    if (market.isDefault || market.code === "FR") {
      return {
        marketCode: market.code,
        totalFieldsCount,
        inheritedFieldsCount: 0,
        overriddenFieldsCount: 0,
        percentInherited: 0,
        percentOverridden: 100,
      };
    }

    let overriddenCount = 0;
    for (const path of allPaths) {
      if (getNestedValue(market.overrides, path) !== undefined) {
        overriddenCount++;
      }
    }

    const inheritedCount = totalFieldsCount - overriddenCount;
    const percentInherited = Math.round(
      (inheritedCount / totalFieldsCount) * 100,
    );
    const percentOverridden = 100 - percentInherited;

    return {
      marketCode: market.code,
      totalFieldsCount,
      inheritedFieldsCount: inheritedCount,
      overriddenFieldsCount: overriddenCount,
      percentInherited,
      percentOverridden,
    };
  }

  /**
   * Identifies which other markets currently inherit a specific French setting
   * (useful for impact analysis when an administrator modifies France).
   */
  public getImpactedMarkets(
    settingPath: string,
    allMarkets: Market[],
  ): string[] {
    const impactedCodes: string[] = [];
    for (const m of allMarkets) {
      if (m.code !== "FR" && !m.isDefault) {
        const localVal = getNestedValue(m.overrides, settingPath);
        if (localVal === undefined) {
          impactedCodes.push(m.code);
        }
      }
    }
    return impactedCodes;
  }
}

export const marketResolver = new MarketResolver();
