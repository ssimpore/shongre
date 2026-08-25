/** Provider-neutral capability contracts. Credentials never cross these boundaries. */
export interface ProviderInvocationContext {
  tenantId: string;
  userId?: string;
  connectionId: string;
  providerId: string;
  capability: string;
  feature: string;
  correlationId: string;
  marketCode: string;
  locale: string;
}

export interface AiGenerationRequest {
  task:
    | "crm.follow_up_draft"
    | "crm.activity_summary"
    | "crm.account_enrichment"
    | "crm.next_action"
    | "crm.duplicate_assistance"
    | "marketing.campaign_draft"
    | "marketing.subject_generation"
    | "marketing.preview_generation"
    | "marketing.content_rewrite"
    | "marketing.ab_generation"
    | "marketing.translation"
    | "marketing.performance_analysis"
    | "marketing.segment_suggestion";
  instructions: string;
  safeContext: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  maxOutputTokens: number;
}

export interface AiGenerationResult {
  text: string;
  structuredOutput?: Record<string, unknown>;
  model: string;
  inputUnits?: number;
  outputUnits?: number;
  providerRequestId?: string;
}

export interface AiGateway {
  generate(
    context: ProviderInvocationContext,
    request: AiGenerationRequest,
  ): Promise<AiGenerationResult>;
}

export interface MailboxMessageDraft {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  textBody: string;
  htmlBody?: string;
  replyToMessageId?: string;
  idempotencyKey: string;
}

export interface MailboxMessageResult {
  externalMessageId: string;
  externalThreadId?: string;
  acceptedAt: string;
}

export interface MailboxThreadMessage {
  externalMessageId: string;
  externalThreadId: string;
  direction: "INBOUND" | "OUTBOUND";
  sender: string;
  recipients: string[];
  subject: string;
  textPreview: string;
  occurredAt: string;
}

export interface MailboxGateway {
  sendMessage(
    context: ProviderInvocationContext,
    draft: MailboxMessageDraft,
  ): Promise<MailboxMessageResult>;
  syncThread(
    context: ProviderInvocationContext,
    externalThreadId: string,
    cursor?: string,
  ): Promise<{ items: MailboxThreadMessage[]; nextCursor?: string }>;
}

export interface EmailDeliveryRequest {
  to: string[];
  from?: { email: string; name?: string };
  replyTo?: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  templateId?: string;
  templateVariables?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  purpose: "MARKETING" | "TRANSACTIONAL" | "CRM_CORRESPONDENCE" | "SECURITY" | "SYSTEM";
  idempotencyKey: string;
}

export interface EmailDeliveryHealth {
  status: "HEALTHY" | "DEGRADED" | "UNAVAILABLE";
  checkedAt: string;
  message?: string;
}

export interface EmailDeliveryCapabilities {
  batch: boolean;
  providerTemplates: boolean;
  customHeaders: boolean;
  webhookEvents: string[];
  maxBatchSize: number;
}

export interface NormalizedEmailDeliveryEvent {
  providerEventId: string;
  externalMessageId: string;
  type:
    | "ACCEPTED"
    | "DELIVERED"
    | "DEFERRED"
    | "BOUNCED_SOFT"
    | "BOUNCED_HARD"
    | "COMPLAINT"
    | "OPENED"
    | "CLICKED"
    | "UNSUBSCRIBED";
  occurredAt: string;
  recipient?: string;
  reason?: string;
}

export interface EmailDeliveryGateway {
  testConnection(context: ProviderInvocationContext): Promise<EmailDeliveryHealth>;
  getCapabilities(context: ProviderInvocationContext): Promise<EmailDeliveryCapabilities>;
  send(
    context: ProviderInvocationContext,
    request: EmailDeliveryRequest,
  ): Promise<{ externalMessageId: string; acceptedAt: string }>;
  sendBatch?(
    context: ProviderInvocationContext,
    requests: EmailDeliveryRequest[],
  ): Promise<Array<{ externalMessageId: string; acceptedAt: string }>>;
  normalizeWebhook?(
    context: ProviderInvocationContext,
    payload: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<NormalizedEmailDeliveryEvent[]>;
}

export interface CalendarGateway {
  createMeeting(
    context: ProviderInvocationContext,
    input: {
      title: string;
      startsAt: string;
      endsAt: string;
      attendeeEmails: string[];
      description?: string;
      idempotencyKey: string;
    },
  ): Promise<{ externalEventId: string; joinUrl?: string }>;
}

export interface SmsGateway {
  send(
    context: ProviderInvocationContext,
    input: { to: string; body: string; idempotencyKey: string },
  ): Promise<{ externalMessageId: string; acceptedAt: string }>;
}

export interface CallingGateway {
  startCall(
    context: ProviderInvocationContext,
    input: { to: string; from?: string; idempotencyKey: string },
  ): Promise<{ externalCallId: string; startedAt: string }>;
}
