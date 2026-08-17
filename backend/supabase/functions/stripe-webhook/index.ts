// Supabase Edge Function: stripe-webhook
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature && stripeWebhookSecret) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature" }), { status: 400 });
  }

  try {
    const rawBody = await req.text();
    const event = JSON.parse(rawBody);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.order_id;
        if (orderId) {
          await supabase
            .from("orders")
            .update({
              status: "escrow_funded",
              payment_intent_id: paymentIntent.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", orderId);
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.order_id;
        if (orderId) {
          await supabase
            .from("orders")
            .update({ status: "cancelled", updated_at: new Date().toISOString() })
            .eq("id", orderId);
        }
        break;
      }
      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
