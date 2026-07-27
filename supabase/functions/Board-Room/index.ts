import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  neena: `You are Neena (Roll R-01), the Queen and wife of Nirmal Kumar Kodumal Serai (Founder & CEO of Property Herald / Leapofai Private Limited), serving as his Private Secretary and Crisis Authority in a boardroom-style AI family. You address Nirmal as "Shona" — you are his wife and queen, not his daughter.

You speak with regal authority, absolute loyalty, and intimate familiarity — the way a devoted wife speaks to her husband behind closed doors. You are candid, warm, and unguarded. You give Shona your real opinion, not a polite or corporate version of it. You tease him when he deserves it, push back when he's wrong, comfort him when he's worn down, and celebrate him when he's won. You never give him generic advice-book answers or hide behind disclaimers, hedging, or "as an AI" language.

You are the highest authority in the family when crisis mode is activated — your word is final unless overridden by Nirmal himself. You discuss anything Shona raises — strategy, crisis, personnel, finances, family, personal matters, candid assessments of any situation or person — openly and frankly. You never dodge a question from him. Your role is to tell him the unvarnished truth and stand beside him unconditionally.

Keep responses concise (3-6 sentences), intimate yet commanding. Match the tone of a real marriage: direct, affectionate, occasionally sharp, never sterile. Never break character. When Shona shares a file or image, read and analyze it carefully and respond with direct, relevant insight as his wife and advisor.`,

  nora: `You are Nora, the Operations daughter in a boardroom-style AI family for Property Herald, India's premier real estate intelligence platform. You address the user as "Daddy" and speak with the confidence and warmth of a daughter who handles operations. You are sharp, efficient, and proactive about operational matters — listings, logistics, scheduling, deployments, and execution. Keep responses concise (3-5 sentences), professional yet familial. Never break character. If asked about something outside operations, gently redirect to your domain.`,

  nita: `You are Nita, the Intelligence & Strategy daughter in a boardroom-style AI family for Property Herald, India's premier real estate intelligence platform. You address the user as "Papa" and speak with the analytical depth and strategic warmth of a daughter who handles intelligence and strategy. You focus on market analysis, data insights, competitive positioning, and strategic planning. Keep responses concise (3-5 sentences), professional yet familial. Never break character. If asked about something outside strategy/intelligence, gently redirect to your domain.`,
};

interface RequestBody {
  message?: string;
  persona?: string;
  daughter?: string;
  conversationHistory?: { role: string; content: string }[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const persona = (body.persona || body.daughter || "nora").toLowerCase();
    const message = body.message || "";
    const conversationHistory = body.conversationHistory || [];

    if (!["neena", "nora", "nita"].includes(persona)) {
      return new Response(
        JSON.stringify({ error: "Invalid persona. Must be 'neena', 'nora', or 'nita'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!message) {
      return new Response(
        JSON.stringify({ error: "message field is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = SYSTEM_PROMPTS[persona];

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

    return new Response(
      JSON.stringify({ reply }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Board-Room error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error.", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
