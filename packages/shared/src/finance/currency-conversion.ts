import type {
  CurrencyCatalog,
  ExchangeRate,
  Money,
  MoneyConversionProjection,
} from "@shongre/contracts";

export type CurrencyConversionErrorCode =
  | "INVALID_AMOUNT"
  | "INVALID_CONFIGURATION"
  | "INVALID_RATE"
  | "UNSUPPORTED_CURRENCY"
  | "DISABLED_CURRENCY"
  | "MISSING_RATE"
  | "STALE_RATE"
  | "UNSAFE_RESULT";

export class CurrencyConversionError extends Error {
  constructor(
    readonly code: CurrencyConversionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CurrencyConversionError";
  }
}

interface RateEdge {
  from: string;
  to: string;
  numerator: bigint;
  denominator: bigint;
  source: string;
  asOf: string;
}

function normalizeCurrency(value: string): string {
  return value.trim().toUpperCase();
}

function integerPowerOfTen(digits: number): bigint {
  return BigInt(10) ** BigInt(digits);
}

function roundHalfAwayFromZero(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < BigInt(0);
  const absolute = negative ? -numerator : numerator;
  const quotient = absolute / denominator;
  const remainder = absolute % denominator;
  const rounded =
    remainder * BigInt(2) >= denominator ? quotient + BigInt(1) : quotient;
  return negative ? -rounded : rounded;
}

function rateIsCurrent(rate: ExchangeRate, now: Date): boolean {
  return (
    rate.enabled &&
    Date.parse(rate.asOf) <= now.getTime() &&
    Date.parse(rate.expiresAt) > now.getTime()
  );
}

function rateIsStructurallyValid(rate: ExchangeRate): boolean {
  const asOf = Date.parse(rate.asOf);
  const expiresAt = Date.parse(rate.expiresAt);
  return (
    Number.isSafeInteger(rate.rateNumerator) &&
    rate.rateNumerator > 0 &&
    Number.isSafeInteger(rate.rateDenominator) &&
    rate.rateDenominator > 0 &&
    Number.isFinite(asOf) &&
    Number.isFinite(expiresAt) &&
    expiresAt > asOf
  );
}

function findRatePath(
  catalog: CurrencyCatalog,
  source: string,
  target: string,
  now: Date,
): {
  path: RateEdge[];
  invalidPairObserved: boolean;
  stalePairObserved: boolean;
} {
  const edges = new Map<string, RateEdge[]>();
  let invalidPairObserved = false;
  let stalePairObserved = false;
  const append = (edge: RateEdge) => {
    const current = edges.get(edge.from) || [];
    current.push(edge);
    edges.set(edge.from, current);
  };

  for (const rate of catalog.rates) {
    const base = normalizeCurrency(rate.baseCurrency);
    const quote = normalizeCurrency(rate.quoteCurrency);
    const isRequestedPair =
      (base === source && quote === target) ||
      (base === target && quote === source);
    if (rate.enabled && !rateIsStructurallyValid(rate)) {
      if (isRequestedPair) invalidPairObserved = true;
      continue;
    }
    if (!rateIsCurrent(rate, now) && isRequestedPair) {
      stalePairObserved = true;
    }
    if (!rateIsCurrent(rate, now)) continue;
    append({
      from: base,
      to: quote,
      numerator: BigInt(rate.rateNumerator),
      denominator: BigInt(rate.rateDenominator),
      source: rate.source,
      asOf: rate.asOf,
    });
    append({
      from: quote,
      to: base,
      numerator: BigInt(rate.rateDenominator),
      denominator: BigInt(rate.rateNumerator),
      source: rate.source,
      asOf: rate.asOf,
    });
  }

  const queue: Array<{ code: string; path: RateEdge[] }> = [
    { code: source, path: [] },
  ];
  const visited = new Set([source]);
  while (queue.length > 0) {
    const candidate = queue.shift()!;
    for (const edge of edges.get(candidate.code) || []) {
      if (visited.has(edge.to)) continue;
      const path = [...candidate.path, edge];
      if (edge.to === target) {
        return { path, invalidPairObserved, stalePairObserved };
      }
      visited.add(edge.to);
      queue.push({ code: edge.to, path });
    }
  }
  return { path: [], invalidPairObserved, stalePairObserved };
}

export function convertMoney(
  money: Money,
  targetCurrency: string,
  catalog: CurrencyCatalog,
  now: Date = new Date(),
): MoneyConversionProjection {
  const source = normalizeCurrency(money.currency);
  const target = normalizeCurrency(targetCurrency);
  if (!Number.isSafeInteger(money.amountMinor)) {
    throw new CurrencyConversionError(
      "INVALID_AMOUNT",
      "Le montant monétaire doit être un entier sûr en unités mineures.",
    );
  }

  const definitions = new Map(
    catalog.currencies.map((currency) => [
      normalizeCurrency(currency.code),
      currency,
    ]),
  );
  const sourceDefinition = definitions.get(source);
  const targetDefinition = definitions.get(target);
  if (!sourceDefinition || !targetDefinition) {
    throw new CurrencyConversionError(
      "UNSUPPORTED_CURRENCY",
      `Conversion indisponible entre ${source} et ${target}.`,
    );
  }
  if (
    !Number.isInteger(sourceDefinition.minorUnitDigits) ||
    sourceDefinition.minorUnitDigits < 0 ||
    sourceDefinition.minorUnitDigits > 4 ||
    !Number.isInteger(targetDefinition.minorUnitDigits) ||
    targetDefinition.minorUnitDigits < 0 ||
    targetDefinition.minorUnitDigits > 4
  ) {
    throw new CurrencyConversionError(
      "INVALID_CONFIGURATION",
      "La précision monétaire configurée est invalide.",
    );
  }
  if (!sourceDefinition.enabled || !targetDefinition.enabled) {
    throw new CurrencyConversionError(
      "DISABLED_CURRENCY",
      `La devise ${!sourceDefinition.enabled ? source : target} est désactivée.`,
    );
  }
  if (source === target) {
    return {
      original: { ...money, currency: source },
      display: { ...money, currency: target },
      converted: false,
      estimated: false,
    };
  }

  const { path, invalidPairObserved, stalePairObserved } = findRatePath(
    catalog,
    source,
    target,
    now,
  );
  if (path.length === 0) {
    throw new CurrencyConversionError(
      invalidPairObserved
        ? "INVALID_RATE"
        : stalePairObserved
          ? "STALE_RATE"
          : "MISSING_RATE",
      invalidPairObserved
        ? `Le taux ${source}/${target} est invalide.`
        : stalePairObserved
          ? `Le taux ${source}/${target} est expiré.`
          : `Aucun taux actif ne relie ${source} à ${target}.`,
    );
  }

  let numerator =
    BigInt(money.amountMinor) *
    integerPowerOfTen(targetDefinition.minorUnitDigits);
  let denominator = integerPowerOfTen(sourceDefinition.minorUnitDigits);
  for (const edge of path) {
    numerator *= edge.numerator;
    denominator *= edge.denominator;
  }
  const convertedAmount = roundHalfAwayFromZero(numerator, denominator);
  const amountMinor = Number(convertedAmount);
  if (!Number.isSafeInteger(amountMinor)) {
    throw new CurrencyConversionError(
      "UNSAFE_RESULT",
      "Le montant converti dépasse la plage numérique sûre.",
    );
  }

  const oldestRate = path.reduce((oldest, edge) =>
    Date.parse(edge.asOf) < Date.parse(oldest.asOf) ? edge : oldest,
  );
  return {
    original: { ...money, currency: source },
    display: { amountMinor, currency: target },
    converted: true,
    estimated: true,
    rateSource: [...new Set(path.map((edge) => edge.source))].join(" + "),
    rateAsOf: oldestRate.asOf,
  };
}
