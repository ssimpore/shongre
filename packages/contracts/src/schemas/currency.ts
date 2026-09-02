import { z } from "zod";
import { CURRENCY_CODE_LENGTH, moneySchema } from "./primitives";

export const CURRENCY_CONFIGURATION_REASON_MIN_LENGTH = 8;
export const CURRENCY_CONFIGURATION_REASON_MAX_LENGTH = 500;
export const CURRENCY_MINOR_UNIT_DIGITS_MIN = 0;
export const CURRENCY_MINOR_UNIT_DIGITS_MAX = 4;
export const EXCHANGE_RATE_COMPONENT_MIN = 1;

export const currencyCodeSchema = z
  .string()
  .trim()
  .length(CURRENCY_CODE_LENGTH)
  .regex(/^[A-Z]{3}$/, "La devise doit être un code ISO 4217 à trois lettres.");

export const currencyDefinitionSchema = z
  .object({
    code: currencyCodeSchema,
    displayName: z.string().trim().min(2).max(120),
    symbol: z.string().trim().min(1).max(12),
    minorUnitDigits: z
      .number()
      .int()
      .min(CURRENCY_MINOR_UNIT_DIGITS_MIN)
      .max(CURRENCY_MINOR_UNIT_DIGITS_MAX),
    enabled: z.boolean(),
    version: z.number().int().positive(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const exchangeRateSchema = z
  .object({
    baseCurrency: currencyCodeSchema,
    quoteCurrency: currencyCodeSchema,
    rateNumerator: z
      .number()
      .int()
      .min(EXCHANGE_RATE_COMPONENT_MIN)
      .max(Number.MAX_SAFE_INTEGER),
    rateDenominator: z
      .number()
      .int()
      .min(EXCHANGE_RATE_COMPONENT_MIN)
      .max(Number.MAX_SAFE_INTEGER),
    source: z.string().trim().min(2).max(120),
    asOf: z.string().datetime(),
    expiresAt: z.string().datetime(),
    enabled: z.boolean(),
    version: z.number().int().positive(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict()
  .refine((rate) => rate.baseCurrency !== rate.quoteCurrency, {
    message: "Une paire de change doit contenir deux devises différentes.",
  })
  .refine((rate) => Date.parse(rate.expiresAt) > Date.parse(rate.asOf), {
    message: "L’expiration du taux doit être postérieure à sa date de valeur.",
  });

export const currencyCatalogSchema = z
  .object({
    currencies: z.array(currencyDefinitionSchema),
    rates: z.array(exchangeRateSchema),
    generatedAt: z.string().datetime(),
  })
  .strict();

const configurationReasonSchema = z
  .string()
  .trim()
  .min(CURRENCY_CONFIGURATION_REASON_MIN_LENGTH)
  .max(CURRENCY_CONFIGURATION_REASON_MAX_LENGTH);

export const currencyDefinitionUpdateSchema = z
  .object({
    displayName: z.string().trim().min(2).max(120),
    symbol: z.string().trim().min(1).max(12),
    minorUnitDigits: z
      .number()
      .int()
      .min(CURRENCY_MINOR_UNIT_DIGITS_MIN)
      .max(CURRENCY_MINOR_UNIT_DIGITS_MAX),
    enabled: z.boolean(),
    reason: configurationReasonSchema,
  })
  .strict();

export const exchangeRateUpdateSchema = z
  .object({
    rateNumerator: z
      .number()
      .int()
      .min(EXCHANGE_RATE_COMPONENT_MIN)
      .max(Number.MAX_SAFE_INTEGER),
    rateDenominator: z
      .number()
      .int()
      .min(EXCHANGE_RATE_COMPONENT_MIN)
      .max(Number.MAX_SAFE_INTEGER),
    source: z.string().trim().min(2).max(120),
    asOf: z.string().datetime(),
    expiresAt: z.string().datetime(),
    enabled: z.boolean(),
    reason: configurationReasonSchema,
  })
  .strict()
  .refine((rate) => Date.parse(rate.expiresAt) > Date.parse(rate.asOf), {
    message: "L’expiration du taux doit être postérieure à sa date de valeur.",
  });

export const moneyConversionProjectionSchema = z
  .object({
    original: moneySchema,
    display: moneySchema,
    converted: z.boolean(),
    estimated: z.boolean(),
    rateSource: z.string().optional(),
    rateAsOf: z.string().datetime().optional(),
  })
  .strict();

export type CurrencyDefinition = z.infer<typeof currencyDefinitionSchema>;
export type ExchangeRate = z.infer<typeof exchangeRateSchema>;
export type CurrencyCatalog = z.infer<typeof currencyCatalogSchema>;
export type CurrencyDefinitionUpdate = z.infer<
  typeof currencyDefinitionUpdateSchema
>;
export type ExchangeRateUpdate = z.infer<typeof exchangeRateUpdateSchema>;
export type MoneyConversionProjection = z.infer<
  typeof moneyConversionProjectionSchema
>;
