// Supabase Edge Function: expire-listings (Scheduled Cron)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (_req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date().toISOString();

    // 1. Expire outdated listings
    const { data: expiredListings, error: expErr } = await supabase
      .from("listings")
      .update({ status: "archived", updated_at: now })
      .eq("status", "published")
      .lt("expires_at", now)
      .select("id");

    // 2. Expire expired urgent boosts
    await supabase
      .from("listings")
      .update({ is_urgent: false })
      .eq("is_urgent", true)
      .lt("urgent_expires_at", now);

    // 3. Expire expired featured boosts
    await supabase
      .from("listings")
      .update({ is_featured: false })
      .eq("is_featured", true)
      .lt("featured_expires_at", now);

    return new Response(
      JSON.stringify({
        success: true,
        archivedCount: expiredListings?.length || 0,
        timestamp: now,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
