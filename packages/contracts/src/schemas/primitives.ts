import { z } from "zod";

export const MARKET_CODE_LENGTH = 2;
export const CURRENCY_CODE_LENGTH = 3;

export const marketCodeSchema = z
  .string()
  .length(MARKET_CODE_LENGTH)
  .regex(/^[A-Z]+$/);
export type MarketCode = z.infer<typeof marketCodeSchema>;

export const moneySchema = z.object({
  amountMinor: z.number().int(),
  currency: z.string().length(CURRENCY_CODE_LENGTH),
});
export type Money = z.infer<typeof moneySchema>;
