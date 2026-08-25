import { z } from "zod";

export const crmShongreEventTypeSchema = z.enum([
  "professional.created",
  "professional.verified",
  "organization.updated",
  "subscription.started",
  "subscription.upgraded",
  "subscription.cancelled",
  "subscription.payment_failed",
  "listing.published",
  "lead.created",
  "message.received",
  "advertising.purchased",
]);

export const crmShongreEventEnvelopeSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  eventId: z.string().uuid(),
  eventType: crmShongreEventTypeSchema,
  occurredAt: z.string().datetime({ offset: true }),
  payloadVersion: z.number().int().min(1).max(100),
  source: z.literal("shongre"),
  idempotencyKey: z.string().trim().min(1).max(240),
  payload: z.record(z.string(), z.unknown()),
  attemptNumber: z.number().int().min(1).max(10),
});

export type CrmShongreEventEnvelope = z.infer<
  typeof crmShongreEventEnvelopeSchema
>;
export type CrmShongreEventType = z.infer<typeof crmShongreEventTypeSchema>;

export class PermanentCrmShongreEventError extends Error {
  readonly permanent = true;

  constructor(
    message: string,
    readonly code = "INVALID_SHONGRE_EVENT",
  ) {
    super(message);
    this.name = "PermanentCrmShongreEventError";
  }
}

export function ownerUserIdForCrmShongreEvent(
  event: CrmShongreEventEnvelope,
): string {
  const parsed = z.string().uuid().safeParse(event.payload.ownerUserId);
  if (!parsed.success) {
    throw new PermanentCrmShongreEventError(
      "The Shongre event does not contain a valid ownerUserId.",
    );
  }
  return parsed.data;
}
