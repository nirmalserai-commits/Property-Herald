import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const headers = {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    };

    const { listing_id, profile_id } = await req.json();
    if (!listing_id || !profile_id) {
      return new Response(
        JSON.stringify({ error: "listing_id and profile_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch listing owner's wallet
    const walletRes = await fetch(
      `${SUPABASE_URL}/rest/v1/token_wallets?user_id=eq.${profile_id}&select=balance`,
      { headers }
    );
    const wallets = await walletRes.json();

    if (!wallets.length || wallets[0].balance < 2) {
      // Insufficient tokens — allow the WhatsApp click but skip token deduction
      return new Response(
        JSON.stringify({ success: true, tokens_burned: 0, reason: "insufficient_balance" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentBalance = wallets[0].balance;
    const newBalance = currentBalance - 2;

    // Deduct 2 tokens from listing owner's wallet
    await fetch(
      `${SUPABASE_URL}/rest/v1/token_wallets?user_id=eq.${profile_id}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ balance: newBalance, updated_at: new Date().toISOString() }),
      }
    );

    // Log transaction
    await fetch(`${SUPABASE_URL}/rest/v1/token_transactions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        user_id: profile_id,
        type: "burn",
        amount: -2,
        reason: "WhatsApp Lead Click",
        related_listing_id: listing_id,
        balance_after: newBalance,
      }),
    });

    // Check if balance dropped below threshold (20) and update alert timestamp
    if (currentBalance >= 20 && newBalance < 20) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/token_wallets?user_id=eq.${profile_id}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ low_balance_alerted_at: new Date().toISOString() }),
        }
      );
    }

    // Record the lead click for platform stats (homepage inquiry counter)
    await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_leads`, {
      method: "POST",
      headers,
      body: JSON.stringify({ listing_id, profile_id }),
    });

    return new Response(
      JSON.stringify({ success: true, tokens_burned: 2, new_balance: newBalance }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
