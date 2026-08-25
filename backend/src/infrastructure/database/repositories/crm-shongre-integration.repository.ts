import { randomUUID } from "node:crypto";
import {
  crmShongreIntelligenceSchema,
  type CrmShongreIntelligence,
} from "@shongre/contracts/crm";
import {
  crmShongreEventEnvelopeSchema,
  type CrmShongreEventEnvelope,
  type CrmShongreEventType,
  PermanentCrmShongreEventError,
} from "../../../integrations/shongre/index.js";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { databaseFailure } from "./repository-error.js";

export interface CompleteCrmShongreEventInput {
  eventId: string;
  workerId: string;
  success: boolean;
  permanentFailure?: boolean;
  errorCode?: string;
  errorMessage?: string;
  retryAt?: string;
}

export interface EnqueueCrmShongreEventInput {
  tenantId: string;
  eventId?: string;
  eventType: CrmShongreEventType;
  occurredAt: string;
  payloadVersion?: number;
  idempotencyKey: string;
  payload: Record<string, unknown>;
}

export interface ICrmShongreIntegrationRepository {
  enqueue(input: EnqueueCrmShongreEventInput): Promise<string>;
  claim(
    workerId: string,
    limit: number,
    leaseSeconds: number,
  ): Promise<CrmShongreEventEnvelope[]>;
  apply(event: CrmShongreEventEnvelope, workspaceId: string): Promise<void>;
  complete(input: CompleteCrmShongreEventInput): Promise<void>;
  getAccountIntelligence(
    tenantId: string,
    accountId: string,
  ): Promise<CrmShongreIntelligence>;
}

type DemoEvent = CrmShongreEventEnvelope & {
  status: "pending" | "leased" | "retry" | "succeeded" | "dead_letter";
  leaseOwner?: string;
  availableAt: string;
};

export class DemoCrmShongreIntegrationRepository implements ICrmShongreIntegrationRepository {
  private readonly events = new Map<string, DemoEvent>();
  private readonly idempotency = new Map<string, string>();
  private readonly applied = new Set<string>();

  async enqueue(input: EnqueueCrmShongreEventInput): Promise<string> {
    const key = `${input.tenantId}:${input.idempotencyKey}`;
    const existing = this.idempotency.get(key);
    if (existing) return existing;
    const id = randomUUID();
    const event = crmShongreEventEnvelopeSchema.parse({
      id,
      tenantId: input.tenantId,
      eventId: input.eventId ?? randomUUID(),
      eventType: input.eventType,
      occurredAt: input.occurredAt,
      payloadVersion: input.payloadVersion ?? 1,
      source: "shongre",
      idempotencyKey: input.idempotencyKey,
      payload: input.payload,
      attemptNumber: 1,
    });
    this.events.set(id, {
      ...event,
      attemptNumber: 0,
      status: "pending",
      availableAt: new Date(0).toISOString(),
    });
    this.idempotency.set(key, id);
    return id;
  }

  async claim(workerId: string, limit: number) {
    const now = new Date().toISOString();
    const claimed = [...this.events.values()]
      .filter(
        (event) =>
          ["pending", "retry"].includes(event.status) &&
          event.availableAt <= now,
      )
      .slice(0, limit);
    for (const event of claimed) {
      event.status = "leased";
      event.leaseOwner = workerId;
      event.attemptNumber += 1;
    }
    return structuredClone(claimed).map((event) =>
      crmShongreEventEnvelopeSchema.parse(event),
    );
  }

  async apply(event: CrmShongreEventEnvelope, _workspaceId: string) {
    if (
      ![
        "professional.created",
        "professional.verified",
        "organization.updated",
        "subscription.started",
        "subscription.upgraded",
        "subscription.cancelled",
        "subscription.payment_failed",
      ].includes(event.eventType)
    ) {
      throw new PermanentCrmShongreEventError(
        `Unsupported CRM projection event: ${event.eventType}`,
      );
    }
    this.applied.add(event.eventId);
  }

  async complete(input: CompleteCrmShongreEventInput) {
    const event = this.events.get(input.eventId);
    if (!event || event.leaseOwner !== input.workerId) {
      throw new Error("CRM integration lease ownership mismatch");
    }
    event.leaseOwner = undefined;
    if (input.success) event.status = "succeeded";
    else if (input.permanentFailure || event.attemptNumber >= 7)
      event.status = "dead_letter";
    else {
      event.status = "retry";
      event.availableAt = input.retryAt ?? new Date().toISOString();
    }
  }

  hasApplied(eventId: string) {
    return this.applied.has(eventId);
  }

  async getAccountIntelligence(
    _tenantId: string,
    accountId: string,
  ): Promise<CrmShongreIntelligence> {
    if (accountId !== "20000000-0000-4000-8000-000000000001") {
      return unlinkedIntelligence();
    }
    return crmShongreIntelligenceSchema.parse({
      linked: true,
      sourceSystem: "shongre",
      organization: {
        id: "10000000-0000-4000-8000-000000000001",
        name: "L'Atelier Nordique",
        legalName: "L'Atelier Nordique SAS",
        verified: true,
        marketCode: "FR",
        city: "Paris",
      },
      professional: {
        availability: "available",
        ownerUserId: "10000000-0000-4000-8000-000000000004",
        ownerName: "Camille Durand",
        emailVerified: true,
        phoneVerified: true,
        businessVerified: true,
      },
      listings: {
        availability: "available",
        total: 34,
        published: 28,
        recent: [
          {
            id: "93000000-0000-4000-8000-000000000001",
            title: "Buffet scandinave restauré",
            status: "published",
            marketCode: "FR",
            updatedAt: "2026-08-24T15:30:00.000Z",
          },
          {
            id: "93000000-0000-4000-8000-000000000002",
            title: "Fauteuil lounge en teck",
            status: "published",
            marketCode: "FR",
            updatedAt: "2026-08-23T10:15:00.000Z",
          },
        ],
      },
      subscription: {
        availability: "available",
        id: "94000000-0000-4000-8000-000000000001",
        productId: "shongre-pro-business",
        status: "active",
        currentPeriodEndsAt: "2026-09-30T21:59:59.000Z",
        cancelAtPeriodEnd: false,
      },
      advertising: { availability: "not_connected" },
      leads: { availability: "not_connected" },
      marketplaceActivity: { availability: "not_connected" },
      lastSynchronizedAt: "2026-08-25T08:00:00.000Z",
    });
  }
}

function unlinkedIntelligence(): CrmShongreIntelligence {
  return crmShongreIntelligenceSchema.parse({
    linked: false,
    sourceSystem: "shongre",
    professional: { availability: "not_linked" },
    listings: {
      availability: "not_linked",
      total: 0,
      published: 0,
      recent: [],
    },
    subscription: { availability: "not_linked" },
    advertising: { availability: "not_linked" },
    leads: { availability: "not_linked" },
    marketplaceActivity: { availability: "not_linked" },
  });
}

function mapClaimedEvent(row: any): CrmShongreEventEnvelope {
  return crmShongreEventEnvelopeSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    eventType: row.event_type,
    occurredAt: row.occurred_at,
    payloadVersion: row.payload_version,
    source: row.source,
    idempotencyKey: row.idempotency_key,
    payload: row.payload,
    attemptNumber: row.attempt_number,
  });
}

export class PostgresCrmShongreIntegrationRepository implements ICrmShongreIntegrationRepository {
  private readonly client = getSupabaseAdminClient();

  async enqueue(input: EnqueueCrmShongreEventInput): Promise<string> {
    const { data, error } = await this.client.rpc(
      "enqueue_crm_shongre_event" as any,
      {
        p_tenant_id: input.tenantId,
        p_event_id: input.eventId ?? randomUUID(),
        p_event_type: input.eventType,
        p_occurred_at: input.occurredAt,
        p_payload_version: input.payloadVersion ?? 1,
        p_source: "shongre",
        p_idempotency_key: input.idempotencyKey,
        p_payload: input.payload,
      } as any,
    );
    if (error) databaseFailure("crmShongre.enqueue", error);
    return String(data);
  }

  async claim(workerId: string, limit: number, leaseSeconds: number) {
    const { data, error } = await this.client.rpc(
      "claim_crm_shongre_events" as any,
      {
        p_worker_id: workerId,
        p_limit: limit,
        p_lease_seconds: leaseSeconds,
      } as any,
    );
    if (error) databaseFailure("crmShongre.claim", error);
    return (data ?? []).map(mapClaimedEvent);
  }

  async apply(event: CrmShongreEventEnvelope, workspaceId: string) {
    const { error } = await this.client.rpc(
      "apply_crm_shongre_event" as any,
      { p_inbox_id: event.id, p_workspace_id: workspaceId } as any,
    );
    if (!error) return;
    const code = String((error as any).code ?? "");
    if (code === "22023" || code === "42501") {
      throw new PermanentCrmShongreEventError(
        "The CRM rejected an invalid Shongre event.",
        code,
      );
    }
    databaseFailure("crmShongre.apply", error);
  }

  async complete(input: CompleteCrmShongreEventInput) {
    const { error } = await this.client.rpc(
      "complete_crm_shongre_event" as any,
      {
        p_event_id: input.eventId,
        p_worker_id: input.workerId,
        p_success: input.success,
        p_permanent_failure: input.permanentFailure ?? false,
        p_error_code: input.errorCode ?? "",
        p_error_message: input.errorMessage ?? "",
        p_retry_at: input.retryAt,
      } as any,
    );
    if (error) databaseFailure("crmShongre.complete", error);
  }

  async getAccountIntelligence(
    tenantId: string,
    accountId: string,
  ): Promise<CrmShongreIntelligence> {
    const { data: reference, error: referenceError } = await this.client
      .from("crm_external_references")
      .select("source_entity_id,metadata,updated_at")
      .eq("tenant_id", tenantId)
      .eq("crm_entity_type", "account")
      .eq("crm_entity_id", accountId)
      .eq("source_system", "shongre")
      .eq("source_entity_type", "organization")
      .maybeSingle();
    if (referenceError)
      databaseFailure("crmShongre.getAccountReference", referenceError);
    if (!reference) return unlinkedIntelligence();
    const externalReference: any = reference;

    const { data: organization, error: organizationError } = await this.client
      .from("organizations")
      .select(
        "id,owner_id,legal_name,trade_name,is_verified,country,city,owner:owner_id(name,is_email_verified,is_phone_verified,is_business_verified)",
      )
      .eq("id", externalReference.source_entity_id)
      .maybeSingle();
    if (organizationError || !organization) {
      databaseFailure("crmShongre.getCanonicalOrganization", organizationError);
    }
    const canonicalOrganization: any = organization;
    const owner: any = Array.isArray(canonicalOrganization.owner)
      ? canonicalOrganization.owner[0]
      : canonicalOrganization.owner;
    const [listingResult, publishedResult, subscriptionResult] =
      await Promise.all([
        this.client
          .from("listings")
          .select("id,title,status,market_code,updated_at", { count: "exact" })
          .eq("seller_id", canonicalOrganization.owner_id)
          .order("updated_at", { ascending: false })
          .limit(5),
        this.client
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("seller_id", canonicalOrganization.owner_id)
          .eq("status", "published"),
        this.client
          .from("monetization_subscriptions")
          .select(
            "id,product_id,status,current_period_end,cancel_at_period_end,updated_at",
          )
          .eq("account_id", canonicalOrganization.owner_id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
    if (
      listingResult.error ||
      publishedResult.error ||
      subscriptionResult.error
    ) {
      databaseFailure("crmShongre.getCanonicalIntelligence", {
        listing: listingResult.error,
        published: publishedResult.error,
        subscription: subscriptionResult.error,
      });
    }
    const subscription: any = subscriptionResult.data;
    return crmShongreIntelligenceSchema.parse({
      linked: true,
      sourceSystem: "shongre",
      organization: {
        id: canonicalOrganization.id,
        name:
          canonicalOrganization.trade_name ?? canonicalOrganization.legal_name,
        legalName: canonicalOrganization.legal_name,
        verified: Boolean(canonicalOrganization.is_verified),
        marketCode: canonicalOrganization.country,
        city: canonicalOrganization.city ?? undefined,
      },
      professional: {
        availability: "available",
        ownerUserId: canonicalOrganization.owner_id,
        ownerName: owner?.name,
        emailVerified: Boolean(owner?.is_email_verified),
        phoneVerified: Boolean(owner?.is_phone_verified),
        businessVerified: Boolean(owner?.is_business_verified),
      },
      listings: {
        availability: "available",
        total: listingResult.count ?? 0,
        published: publishedResult.count ?? 0,
        recent: (listingResult.data ?? []).map((listing: any) => ({
          id: listing.id,
          title: listing.title,
          status: listing.status,
          marketCode: listing.market_code,
          updatedAt: listing.updated_at,
        })),
      },
      subscription: subscription
        ? {
            availability: "available",
            id: subscription.id,
            productId: subscription.product_id,
            status: subscription.status,
            currentPeriodEndsAt: subscription.current_period_end,
            cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
          }
        : { availability: "available" },
      advertising: { availability: "not_connected" },
      leads: { availability: "not_connected" },
      marketplaceActivity: { availability: "not_connected" },
      lastSynchronizedAt: externalReference.updated_at,
    });
  }
}
