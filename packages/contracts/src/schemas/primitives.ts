import { z } from "zod";

export const marketCodeSchema = z.string().regex(/^[A-Z]{2}$/);
export type MarketCode = z.infer<typeof marketCodeSchema>;

export const moneySchema = z.object({
  amountMinor: z.number().int(),
  currency: z.string().length(3),
});
export type Money = z.infer<typeof moneySchema>;
