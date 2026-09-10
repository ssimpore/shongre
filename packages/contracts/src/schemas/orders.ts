import { z } from "zod";

/**
 * Bounds the order return flow enforces.
 *
 * Named here rather than repeated as literals so the database check
 * constraint, the service validation and the input controls that stop a person
 * typing past the limit all move together. A form that lets someone write
 * 6 000 characters only to be refused by the server is the failure this
 * prevents.
 */
export const ORDER_RETURN_CONSTRAINTS = {
  detailsMinLength: 10,
  detailsMaxLength: 5_000,
  decisionNoteMaxLength: 2_000,
  carrierNameMaxLength: 120,
  trackingNumberMaxLength: 120,
} as const;

export const orderReturnReasonSchema = z.enum([
  "withdrawal",
  "damaged",
  "not_as_described",
  "wrong_item",
  "missing_parts",
  "other",
]);

export type OrderReturnReasonValue = z.infer<typeof orderReturnReasonSchema>;

export const orderReturnRequestSchema = z
  .object({
    reason: orderReturnReasonSchema,
    details: z
      .string()
      .trim()
      .min(ORDER_RETURN_CONSTRAINTS.detailsMinLength)
      .max(ORDER_RETURN_CONSTRAINTS.detailsMaxLength),
  })
  .strict();

export const orderReturnDecisionSchema = z
  .object({
    approve: z.boolean(),
    note: z
      .string()
      .trim()
      .max(ORDER_RETURN_CONSTRAINTS.decisionNoteMaxLength)
      .optional(),
  })
  .strict();

export const orderReturnShipmentSchema = z
  .object({
    carrierName: z
      .string()
      .trim()
      .max(ORDER_RETURN_CONSTRAINTS.carrierNameMaxLength)
      .optional(),
    trackingNumber: z
      .string()
      .trim()
      .max(ORDER_RETURN_CONSTRAINTS.trackingNumberMaxLength)
      .optional(),
  })
  .strict();
