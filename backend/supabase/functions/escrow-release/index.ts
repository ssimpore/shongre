// Supabase Edge Function: escrow-release
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const { orderId, pin, actorId } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId is required" }), { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404 });
    }

    // Verify PIN if hand delivery
    if (order.delivery_method === "hand_delivery") {
      if (!pin) {
        return new Response(JSON.stringify({ error: "Handover PIN required" }), { status: 400 });
      }
      if (order.handover_pin !== pin) {
        await supabase
          .from("orders")
          .update({ pin_attempts: (order.pin_attempts || 0) + 1 })
          .eq("id", orderId);
        return new Response(JSON.stringify({ error: "Invalid PIN code", success: false }), { status: 400 });
      }
    }

    // Execute atomic release stored procedure
    const { data: releaseResult, error: releaseErr } = await supabase.rpc("release_order_escrow", {
      p_order_id: orderId,
      p_actor_id: actorId || order.buyer_id,
    });

    if (releaseErr) {
      return new Response(JSON.stringify({ error: releaseErr.message }), { status: 500 });
    }

    return new Response(JSON.stringify(releaseResult), {
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
