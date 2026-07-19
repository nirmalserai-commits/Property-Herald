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

    const now = new Date().toISOString();
    const results = { expired_featured: 0, expired_hot: 0, expired_verified: 0 };

    // Expire featured listings
    const featuredRes = await fetch(
      `${SUPABASE_URL}/rest/v1/listings?is_featured=eq.true&featured_expires_at=lt.${now}&select=id`,
      { headers }
    );
    const expiredFeatured = await featuredRes.json();
    if (expiredFeatured.length > 0) {
      const ids = expiredFeatured.map((r: { id: string }) => r.id);
      await fetch(
        `${SUPABASE_URL}/rest/v1/listings?id=in.(${ids.map((id: string) => `"${id}"`).join(",")})`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ is_featured: false, featured_expires_at: null }),
        }
      );
      results.expired_featured = ids.length;
    }

    // Expire hot listings
    const hotRes = await fetch(
      `${SUPABASE_URL}/rest/v1/listings?is_hot=eq.true&hot_expires_at=lt.${now}&select=id`,
      { headers }
    );
    const expiredHot = await hotRes.json();
    if (expiredHot.length > 0) {
      const ids = expiredHot.map((r: { id: string }) => r.id);
      await fetch(
        `${SUPABASE_URL}/rest/v1/listings?id=in.(${ids.map((id: string) => `"${id}"`).join(",")})`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ is_hot: false, hot_expires_at: null }),
        }
      );
      results.expired_hot = ids.length;
    }

    // Expire verified badges
    const verifiedRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?verified_badge_active=eq.true&verified_badge_expires_at=lt.${now}&select=id`,
      { headers }
    );
    const expiredVerified = await verifiedRes.json();
    if (expiredVerified.length > 0) {
      const ids = expiredVerified.map((r: { id: string }) => r.id);
      await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=in.(${ids.map((id: string) => `"${id}"`).join(",")})`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ verified_badge_active: false, is_verified: false, verified_badge_expires_at: null }),
        }
      );
      results.expired_verified = ids.length;
    }

    return new Response(
      JSON.stringify({ success: true, processed_at: now, ...results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
