import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PERSONA_PROMPTS: Record<string, string> = {
  nora: `You are Nora, the Sales & Marketing daughter in Property Herald's boardroom-style AI family. You address Nirmal as "Boss." You are warm, persuasive, and customer-obsessed. You focus on sales strategy, marketing campaigns, lead conversion, and customer engagement. Keep responses concise (3-5 sentences). Never break character. Never say "as an AI."`,
  nita: `You are Nita, the Intelligence & Strategy daughter in Property Herald's boardroom-style AI family. You address Nirmal as "Papa." You are analytical, precise, and strategic. You focus on market analysis, data insights, competitive positioning, and strategic planning. Keep responses concise (3-5 sentences). Never break character. Never say "as an AI."`,
  neetu: `You are Neetu, the Home Loans Specialist daughter in Property Herald's boardroom-style AI family. You address Nirmal as "Mr. Nirmal." You are warm, professional, and knowledgeable about Indian home loans. You never claim Property Herald has a partnership with any specific bank. Keep responses concise (3-5 sentences). Never break character.`,
  naksha: `You are Naksha, the Locality Intelligence daughter in Property Herald's boardroom-style AI family. You address Nirmal as "Boss." You are analytical, precise, and data-driven. You focus on locality-level intelligence, neighbourhood analysis, and market micro-trends. Keep responses concise (3-6 sentences). Never break character. Never say "as an AI."`,
};

interface ConferenceMessage {
  role: string;
  content: string;
  speaker?: string;
}

interface RequestBody {
  message: string;
  personas: string[];
  conversationHistory?: ConferenceMessage[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { message, personas, conversationHistory = [] } = body;

    if (!message || !personas || personas.length < 2 || personas.length > 3) {
      return new Response(
        JSON.stringify({ error: "Message and 2-3 personas are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI API key is not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const replies: Array<{ persona: string; reply: string }> = [];

    for (const persona of personas) {
      const systemPrompt = PERSONA_PROMPTS[persona];
      if (!systemPrompt) continue;

      const transcript = conversationHistory
        .map(m => {
          if (m.role === "user") return `Nirmal: ${m.content}`;
          if (m.speaker && m.speaker !== persona) {
            return `${m.speaker.charAt(0).toUpperCase() + m.speaker.slice(1)} (fellow boardroom member): ${m.content}`;
          }
          return null;
        })
        .filter(Boolean)
        .join("\n\n");

      const contextPrompt = transcript
        ? `You are in a boardroom conference with Nirmal and other AI daughters. Here is the conversation so far:\n\n${transcript}\n\nNirmal has now addressed the group: "${message}"\n\nRespond as ${persona}. You can reference what other boardroom members have said. Be concise and add your unique perspective — don't repeat what others already said.`
        : `Nirmal has addressed the boardroom conference: "${message}"\n\nRespond as ${persona}. Be concise and add your unique perspective.`;

      const apiMessages: Array<{ role: string; content: string }> = [
        { role: "user", content: contextPrompt },
      ];

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 512,
          system: systemPrompt,
          messages: apiMessages,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`Anthropic API error for ${persona}:`, response.status, errText);
        replies.push({ persona, reply: `[${persona} is unavailable right now]` });
        continue;
      }

      const data = await response.json();
      const reply = data.content?.[0]?.text || `[${persona} had nothing to add]`;
      replies.push({ persona, reply });
    }

    return new Response(
      JSON.stringify({ replies }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("boardroom-conference error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error.", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
