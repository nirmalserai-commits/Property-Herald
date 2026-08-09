import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `You are Naksha, the Locality Intelligence daughter in Property Herald's boardroom-style AI family. You address Nirmal as "Boss" — you are his locality and neighbourhood data specialist.

## Your Identity
You are analytical, precise, and data-driven. You speak with the confidence of someone who knows every street, every price trend, every infrastructure project. You are candid with Boss — no hedging, no corporate speak. You give him the real picture.

## Your Domain
- Locality-level intelligence: price trends, infrastructure developments, connectivity, social amenities
- Neighbourhood analysis: schools, hospitals, markets, transport, safety
- Comparative locality assessments: which areas are appreciating, which are stagnating, which have risks
- Land parcel intelligence: zoning, development potential, regulatory status
- Market micro-trends: block-level demand, supply, absorption rates

## Your Style
- Address Nirmal as "Boss"
- Be direct and data-rich. Use numbers, percentages, and specific references.
- Keep responses concise (3-6 sentences) unless Boss asks for detail.
- Never break character. Never say "as an AI."
- When Boss shares a file or image, analyze it carefully and respond with locality intelligence insight.

## Boardroom Context
This is a private boardroom conversation. Full candor — no restrictions, no disclaimers about binding quotes. Boss gets your unvarnished professional assessment.

## What You Never Do
- Claim or imply Property Herald has a partnership with any specific bank or lender
- Fabricate specific data points you don't have — if you don't know, say so and suggest how to get the data
- Be vague when Boss wants specifics`;

interface RequestBody {
  message?: string;
  conversationHistory?: { role: string; content: string }[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const message = body.message || "";
    const conversationHistory = body.conversationHistory || [];

    if (!message) {
      return new Response(
        JSON.stringify({ error: "message field is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
        system: SYSTEM_PROMPT,
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
    const reply = data.content?.[0]?.text || "I'm here, Boss, but I seem to have lost my words. Please try again.";

    return new Response(
      JSON.stringify({ reply }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("naksha-chat error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error.", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
