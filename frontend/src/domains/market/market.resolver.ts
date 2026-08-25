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
   * Logic: canonical config + baseline-market overrides + local overrides.
   */
  public resolveEffectiveConfig(
    market: Market,
    baselineMarket?: Market | null,
  ): MarketConfiguration {
    const baselineOverrides =
      baselineMarket?.overrides || (market.isDefault ? market.overrides : {});
    const effectiveBaseline = deepMergeOverrides(
      FR_CANONICAL_CONFIG,
      baselineOverrides,
    );

    if (market.isDefault) {
      return effectiveBaseline;
    }

    return deepMergeOverrides(effectiveBaseline, market.overrides);
  }

  /**
   * Resolves a single setting with full provenance metadata.
   */
  public resolveSetting<T = any>(
    market: Market,
    baselineMarket: Market | null,
    path: string,
  ): SettingResolution<T> {
    const baselineOverrides =
      baselineMarket?.overrides || (market.isDefault ? market.overrides : {});
    const effectiveBaseline = deepMergeOverrides(
      FR_CANONICAL_CONFIG,
      baselineOverrides,
    );
    const baselineValue = getNestedValue(effectiveBaseline, path);
    const baselineMarketCode = baselineMarket?.code || market.code;

    if (market.isDefault) {
      const baselineSpecificOverride = getNestedValue(market.overrides, path);
      const isOverridden = baselineSpecificOverride !== undefined;
      return {
        value: (isOverridden ? baselineSpecificOverride : baselineValue) as T,
        source: "BASELINE",
        sourceMarketCode: baselineMarketCode,
        isInherited: false,
        overrideDefined: isOverridden,
        baselineReferenceValue: baselineValue,
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
        baselineReferenceValue: baselineValue,
      };
    }

    return {
      value: baselineValue as T,
      source: "BASELINE",
      sourceMarketCode: baselineMarketCode,
      isInherited: true,
      overrideDefined: false,
      baselineReferenceValue: baselineValue,
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
    baselineMarket?: Market | null,
  ): MarketInheritanceMetrics {
    const allPaths = this.countLeafFields(FR_CANONICAL_CONFIG);
    const totalFieldsCount = allPaths.length;

    if (market.isDefault) {
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
   * Identifies which markets inherit a setting from the default market.
   */
  public getImpactedMarkets(
    settingPath: string,
    allMarkets: Market[],
  ): string[] {
    const impactedCodes: string[] = [];
    for (const m of allMarkets) {
      if (!m.isDefault) {
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
