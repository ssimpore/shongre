import {
  Market,
  MarketConfiguration,
  SettingResolution,
  MarketInheritanceMetrics,
} from "./market.types";

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
 * Only `undefined` values are ignored while materializing a bootstrap policy.
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

    // Undefined leaves the bootstrap input unchanged.
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
 * Explicit market policy resolver.
 */
export class MarketResolver {
  /**
   * Resolves the complete effective MarketConfiguration for a given market.
   * A market carries a complete configuration; another market is never used as
   * a runtime fallback.
   */
  public resolveEffectiveConfig(
    market: Market,
    _baselineMarket?: Market | null,
  ): MarketConfiguration {
    return deepClone(market.configuration);
  }

  /**
   * Resolves a single setting with full provenance metadata.
   */
  public resolveSetting<T = any>(
    market: Market,
    baselineMarket: Market | null,
    path: string,
  ): SettingResolution<T> {
    const localValue = getNestedValue(market.configuration, path);
    const baselineValue = baselineMarket
      ? getNestedValue(baselineMarket.configuration, path)
      : localValue;
    return {
      value: localValue as T,
      source: "LOCAL",
      sourceMarketCode: market.code,
      isInherited: false,
      overrideDefined: localValue !== undefined,
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
   * Reports explicit configuration coverage for the compatibility admin API.
   */
  public getInheritanceMetrics(
    market: Market,
    baselineMarket?: Market | null,
  ): MarketInheritanceMetrics {
    const allPaths = this.countLeafFields(market.configuration);
    const totalFieldsCount = allPaths.length;

    return {
      marketCode: market.code,
      totalFieldsCount,
      inheritedFieldsCount: 0,
      overriddenFieldsCount: totalFieldsCount,
      percentInherited: 0,
      percentOverridden: 100,
    };
  }

  /**
   * Compatibility API: explicit policies never have downstream markets.
   */
  public getImpactedMarkets(
    settingPath: string,
    allMarkets: Market[],
  ): string[] {
    void settingPath;
    void allMarkets;
    return [];
  }
}

export const marketResolver = new MarketResolver();
