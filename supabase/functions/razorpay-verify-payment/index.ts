import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string
): Promise<boolean> {
  const message = `${orderId}|${paymentId}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(keySecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  const expected = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expected === signature;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!RAZORPAY_KEY_SECRET) {
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bundle_id,
      user_id,
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bundle_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify Razorpay HMAC signature
    const isValid = await verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      RAZORPAY_KEY_SECRET
    );

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Payment signature verification failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceHeaders = {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    };

    // Check for duplicate payment (idempotency)
    const dupCheck = await fetch(
      `${SUPABASE_URL}/rest/v1/invoices?razorpay_payment_id=eq.${razorpay_payment_id}&select=id`,
      { headers: serviceHeaders }
    );
    const existing = await dupCheck.json();
    if (existing.length > 0) {
      return new Response(
        JSON.stringify({ success: true, invoice_id: existing[0].id, duplicate: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch bundle
    const bundleRes = await fetch(
      `${SUPABASE_URL}/rest/v1/token_bundles?id=eq.${bundle_id}&select=*`,
      { headers: serviceHeaders }
    );
    const bundles = await bundleRes.json();
    if (!bundles.length) throw new Error("Bundle not found");
    const bundle = bundles[0];

    // Fetch user profile
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user_id}&select=id,contact_person,email`,
      { headers: serviceHeaders }
    );
    const profiles = await profileRes.json();
    if (!profiles.length) throw new Error("User profile not found");
    const profile = profiles[0];

    // Credit tokens to wallet (atomic upsert + log)
    const walletRes = await fetch(
      `${SUPABASE_URL}/rest/v1/token_wallets?user_id=eq.${user_id}`,
      { headers: serviceHeaders }
    );
    const wallets = await walletRes.json();
    const currentBalance = wallets.length ? wallets[0].balance : 0;
    const newBalance = currentBalance + bundle.total_tokens;

    // Upsert wallet
    await fetch(`${SUPABASE_URL}/rest/v1/token_wallets`, {
      method: "POST",
      headers: { ...serviceHeaders, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        user_id,
        balance: newBalance,
        updated_at: new Date().toISOString(),
      }),
    });

    // Log transaction
    await fetch(`${SUPABASE_URL}/rest/v1/token_transactions`, {
      method: "POST",
      headers: serviceHeaders,
      body: JSON.stringify({
        user_id,
        type: "purchase",
        amount: bundle.total_tokens,
        reason: `Token Bundle Purchase — ${bundle.name} (${bundle.total_tokens} tokens)`,
        razorpay_payment_id,
        balance_after: newBalance,
      }),
    });

    // Calculate invoice amounts
    const subtotal = bundle.price_inr;
    const gstAmount = Math.round(subtotal * 0.18 * 100) / 100;
    const totalAmount = subtotal + gstAmount;

    // Create invoice
    const invoiceRes = await fetch(`${SUPABASE_URL}/rest/v1/invoices`, {
      method: "POST",
      headers: { ...serviceHeaders, Prefer: "return=representation" },
      body: JSON.stringify({
        user_id,
        user_name: profile.contact_person || "Property Herald Member",
        user_email: profile.email || "",
        token_amount: bundle.total_tokens,
        price_per_token: 20,
        subtotal,
        gst_rate: 18,
        gst_amount: gstAmount,
        total_amount: totalAmount,
        razorpay_payment_id,
        bundle_name: bundle.name,
        payment_method: "Razorpay",
        payment_status: "Paid",
      }),
    });
    const invoiceData = await invoiceRes.json();
    const invoice = Array.isArray(invoiceData) ? invoiceData[0] : invoiceData;

    return new Response(
      JSON.stringify({
        success: true,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        tokens_credited: bundle.total_tokens,
        new_balance: newBalance,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
