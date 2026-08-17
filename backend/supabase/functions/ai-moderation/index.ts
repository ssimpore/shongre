// Supabase Edge Function: ai-moderation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const { listingId, title, description, price } = await req.json();
    if (!listingId || !title) {
      return new Response(JSON.stringify({ error: "listingId and title required" }), { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Simple heuristic / safety evaluation
    let riskScore = 0;
    const suspiciousKeywords = ["western union", "mandat cash", "virement anonyme", "compte offshore", "fake", "contrefacon", "crypto"];
    const content = `${title} ${description || ""}`.toLowerCase();
    
    for (const kw of suspiciousKeywords) {
      if (content.includes(kw)) {
        riskScore += 35;
      }
    }

    if (price && price <= 0) {
      riskScore += 20;
    }

    const isFlagged = riskScore >= 50;

    // Update listing risk score
    await supabase
      .from("listings")
      .update({
        safety_risk_score: riskScore,
        status: isFlagged ? "flagged" : "published",
        updated_at: new Date().toISOString(),
      })
      .eq("id", listingId);

    // Record fraud score
    await supabase.from("fraud_risk_scores").insert({
      entity_type: "listing",
      entity_id: listingId,
      risk_score: riskScore,
      factors: isFlagged ? ["suspicious_content_or_price"] : [],
      is_flagged: isFlagged,
    });

    return new Response(JSON.stringify({ riskScore, isFlagged }), {
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
