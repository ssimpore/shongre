// Supabase Edge Function: stripe-webhook
//
// This endpoint is a narrow relay to the canonical backend webhook handler.
// The previous implementation parsed an unverified body and directly mutated
// legacy orders. That created an unauthenticated payment-state write path and
// bypassed the finance ledger. The backend verifies the Stripe signature over
// these exact raw bytes, claims the provider event idempotently, and projects
// the resulting business event into billing and finance.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const apiUrl = (Deno.env.get("SHONGRE_API_URL") || "").replace(/\/$/, "");

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature" }), { status: 400 });
  }
  if (!apiUrl) {
    return new Response(JSON.stringify({ error: "Canonical webhook endpoint is not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await req.text();
    const response = await fetch(`${apiUrl}/api/v1/webhooks/stripe`, {
      method: "POST",
      headers: {
        "Content-Type": req.headers.get("content-type") || "application/json",
        "Stripe-Signature": signature,
        "X-Shongre-Webhook-Relay": "supabase-edge",
      },
      body: rawBody,
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch (_error) {
    return new Response(JSON.stringify({ error: "Canonical webhook endpoint unavailable" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
});
