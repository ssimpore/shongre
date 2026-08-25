import { z } from "zod";

export const supportCaseCategories = [
  "account",
  "listing",
  "payment",
  "subscription",
  "verification",
  "safety",
  "privacy",
  "technical",
  "other",
] as const;

export const supportCasePriorities = [
  "low",
  "normal",
  "high",
  "urgent",
] as const;

export const supportCaseStatuses = [
  "open",
  "assigned",
  "waiting_customer",
  "waiting_internal",
  "resolved",
  "closed",
] as const;

export const supportCaseCategorySchema = z.enum(supportCaseCategories);
export const supportCasePrioritySchema = z.enum(supportCasePriorities);
export const supportCaseStatusSchema = z.enum(supportCaseStatuses);

export const supportCaseSchema = z.object({
  id: z.string().min(1),
  reference: z.string().min(3).max(32),
  requesterId: z.string().min(1),
  assigneeId: z.string().min(1).optional(),
  category: supportCaseCategorySchema,
  priority: supportCasePrioritySchema,
  status: supportCaseStatusSchema,
  subject: z.string().min(5).max(160),
  description: z.string().min(20).max(10_000),
  listingId: z.string().min(1).optional(),
  orderId: z.string().min(1).optional(),
  paymentId: z.string().min(1).optional(),
  organizationId: z.string().min(1).optional(),
  slaDueAt: z.string().datetime(),
  lastCustomerReplyAt: z.string().datetime().optional(),
  lastStaffReplyAt: z.string().datetime().optional(),
  resolvedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const supportCaseNoteSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  authorId: z.string().min(1),
  visibility: z.enum(["customer", "internal"]),
  body: z.string().min(2).max(10_000),
  createdAt: z.string().datetime(),
});

export const supportCaseCreateSchema = supportCaseSchema.pick({
  category: true,
  subject: true,
  description: true,
  listingId: true,
  orderId: true,
  paymentId: true,
  organizationId: true,
});

export const supportCaseUpdateSchema = z
  .object({
    status: supportCaseStatusSchema.optional(),
    priority: supportCasePrioritySchema.optional(),
    assigneeId: z.string().min(1).nullable().optional(),
    reason: z.string().min(10).max(2_000),
  })
  .refine(
    (value) =>
      value.status !== undefined ||
      value.priority !== undefined ||
      value.assigneeId !== undefined,
    { message: "at least one support case change is required" },
  );

export const supportCaseNoteCreateSchema = z.object({
  visibility: z.enum(["customer", "internal"]),
  body: z.string().min(2).max(10_000),
});

export const supportCaseFilterSchema = z.object({
  requesterId: z.string().min(1).optional(),
  assigneeId: z.string().min(1).optional(),
  status: supportCaseStatusSchema.optional(),
  priority: supportCasePrioritySchema.optional(),
});

export const supportCaseMetricsSchema = z.object({
  open: z.number().int().nonnegative(),
  urgent: z.number().int().nonnegative(),
  overdue: z.number().int().nonnegative(),
  unassigned: z.number().int().nonnegative(),
  resolvedToday: z.number().int().nonnegative(),
  averageFirstResponseMinutes: z.number().nonnegative(),
});

export type SupportCaseCategory = z.infer<typeof supportCaseCategorySchema>;
export type SupportCasePriority = z.infer<typeof supportCasePrioritySchema>;
export type SupportCaseStatus = z.infer<typeof supportCaseStatusSchema>;
export type SupportCase = z.infer<typeof supportCaseSchema>;
export type SupportCaseNote = z.infer<typeof supportCaseNoteSchema>;
export type SupportCaseCreate = z.infer<typeof supportCaseCreateSchema>;
export type SupportCaseUpdate = z.infer<typeof supportCaseUpdateSchema>;
export type SupportCaseNoteCreate = z.infer<typeof supportCaseNoteCreateSchema>;
export type SupportCaseFilter = z.infer<typeof supportCaseFilterSchema>;
export type SupportCaseMetrics = z.infer<typeof supportCaseMetricsSchema>;
