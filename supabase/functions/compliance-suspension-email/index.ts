import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const authorization = req.headers.get("Authorization");

    if (!supabaseUrl || !serviceRoleKey || !authorization) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }

    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authorization } },
    });
    const { data: authData } = await authClient.auth.getUser();
    if (!authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Email service is unavailable" }), { status: 503, headers: jsonHeaders });
    }

    const body = await req.json() as { profile_id?: string; report_reason?: string };
    if (!body.profile_id) {
      return new Response(JSON.stringify({ error: "profile_id is required" }), { status: 400, headers: jsonHeaders });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("email, business_name, compliance_suspended_at, compliance_suspended_reason")
      .eq("id", body.profile_id)
      .maybeSingle();

    if (profileError || !profile?.email || !profile.compliance_suspended_at) {
      return new Response(JSON.stringify({ error: "Suspended account not found" }), { status: 404, headers: jsonHeaders });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
      body: JSON.stringify({
        from: "Property Herald Compliance <noreply@propertyherald.in>",
        to: profile.email,
        bcc: "nirmalserai@gmail.com",
        subject: "Action required: your Property Herald listings are under review",
        text: `Dear ${profile.business_name || "Property Herald member"},\n\nYour Property Herald listings have been temporarily hidden after a fake-listing report. Please reply within 24 hours with clarification and supporting evidence, including RERA validity proof and ownership or authorization documents where applicable.\n\nReason recorded: ${body.report_reason || profile.compliance_suspended_reason || "Fake listing report"}\n\nOur compliance team will review your response and either reinstate your listings or permanently deactivate the account if the matter is not resolved within the response window.\n\nRegards,\nNita\nChief of Staff, Property Herald`,
      }),
    });

    if (!response.ok) {
      console.error("Resend API error", response.status, await response.text());
      return new Response(JSON.stringify({ error: "Email service returned an error" }), { status: 502, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders });
  } catch (error) {
    console.error("compliance-suspension-email error", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: jsonHeaders });
  }
});
