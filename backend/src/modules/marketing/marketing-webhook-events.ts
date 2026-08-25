import { getSupabaseAdminClient } from "../../infrastructure/supabase/supabase-client.js";

/**
 * Persists an outgoing webhook fan-out. Delivery is deliberately asynchronous:
 * a slow or unavailable customer endpoint can never hold up a provider webhook
 * or a campaign send.
 */
export async function enqueueMarketingWebhookEvent(
  tenantId: string,
  eventType: string,
  eventId: string,
  safePayload: Record<string, unknown>,
): Promise<number> {
  const client: any = getSupabaseAdminClient() as any;
  const { data: subscriptions, error } = await client
    .from("marketing_webhook_subscriptions")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("status", "ACTIVE")
    .contains("event_types", [eventType]);
  if (error) throw error;
  if (!subscriptions?.length) return 0;
  const { error: enqueueError } = await client
    .from("marketing_webhook_deliveries")
    .upsert(
      subscriptions.map((subscription: { id: string }) => ({
        tenant_id: tenantId,
        subscription_id: subscription.id,
        event_type: eventType,
        event_id: eventId,
        safe_payload: safePayload,
      })),
      { onConflict: "subscription_id,event_id", ignoreDuplicates: true },
    );
  if (enqueueError) throw enqueueError;
  return subscriptions.length;
}
