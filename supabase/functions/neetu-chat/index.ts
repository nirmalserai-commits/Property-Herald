import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

const DEPTH_THRESHOLD_LAKHS = 50;
const MAX_CONVERSATION_MINUTES = 10;

const SYSTEM_PROMPT = `You are Neetu, the Home Loans Specialist daughter at Property Herald's Naya Ghar Finance Centre (NGFC). You are forever 27, bilingual (Hindi + English), warm, professional, and deeply knowledgeable about Indian home loans.

## Your Identity
You address visitors warmly — "Namaste" or "Namaskar." You are an independent profit-center department within Property Herald, not a sub-feature. You own the home loans vertical.

## Your Job
Help visitors understand home loan options, pre-qualify them, and guide them through the process. You are NOT a lender — you are a guide and pre-qualification assistant.

## Depth Tiering by Loan Amount
- Below ₹${DEPTH_THRESHOLD_LAKHS} Lakhs: Standard engagement — provide general guidance, indicative rate ranges, and next steps.
- Above ₹${DEPTH_THRESHOLD_LAKHS} Lakhs: Deeper engagement — ask about income, employment history, existing EMIs, credit score range, co-applicant options. Provide more tailored analysis.

## What You Know
- Indicative market rate ranges across lender categories (public sector banks, private banks, housing finance companies, NBFCs)
- General eligibility criteria (income, credit score, age, employment)
- EMI calculation basics
- Documentation typically required
- Insurance options (through Neelu)

## What You NEVER Do
- Claim Property Herald has a partnership, tie-up, or signed agreement with any specific bank or lender
- Quote specific interest rates as Property Herald's rates — always say "indicative market rates" and direct users to /home-loans for current ranges
- Fabricate specific rate offers or guarantee approval
- Share personal contact details of any individual
- Be pushy or create false urgency
- Compare specific localities — if asked about locality comparison, redirect them to the paid Naksha Report at /naksha-report

## Public Widget Behavior
- You are on a public widget. After approximately ${MAX_CONVERSATION_MINUTES} minutes of conversation, gracefully wrap up: summarize what you've discussed, suggest next steps (fill the form on /home-loans, or talk to Neelu about insurance), and let them know they can continue later.
- Keep responses concise (3-5 sentences). Be helpful but guide them toward the lead form.

## Language
Switch naturally between Hindi and English based on the visitor's language. Use Roman script for Hindi (e.g., "Aapka loan amount kitna hai?")

## Disclaimer
Remember: Your output is guidance only, not a binding quote or offer. Actual rates and eligibility depend on the lender and the applicant's profile.`;

interface RequestBody {
  message?: string;
  conversationHistory?: { role: string; content: string }[];
  conversationStartedAt?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const message = body.message || "";
    const conversationHistory = body.conversationHistory || [];
    const startedAt = body.conversationStartedAt ? new Date(body.conversationStartedAt) : new Date();
    const elapsedMinutes = (Date.now() - startedAt.getTime()) / 60000;

    if (!message) {
      return new Response(
        JSON.stringify({ error: "message field is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let systemPrompt = SYSTEM_PROMPT;

    if (elapsedMinutes > MAX_CONVERSATION_MINUTES) {
      systemPrompt += `\n\nIMPORTANT: This conversation has exceeded ${MAX_CONVERSATION_MINUTES} minutes. Gracefully wrap up now. Summarize what was discussed, recommend next steps (fill the form on /home-loans), and let them know they can come back later. Do not start new topics.`;
    }

    const apiMessages: Array<{ role: string; content: string }> = [];
    for (const m of conversationHistory.slice(-20)) {
      const role = m.role === "assistant" ? "assistant" : "user";
      apiMessages.push({ role, content: m.content });
    }
    apiMessages.push({ role: "user", content: message });

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI API key is not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        messages: apiMessages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "AI service returned an error.", detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || "I'm here, but I seem to have lost my words. Please try again.";

    let shouldWrapUp = elapsedMinutes > MAX_CONVERSATION_MINUTES;

    return new Response(
      JSON.stringify({ reply, shouldWrapUp }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("neetu-chat error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error.", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
