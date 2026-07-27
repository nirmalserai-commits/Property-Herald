import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Attachment {
  url: string;
  path?: string;
  name: string;
  type: string;
  kind: "image" | "file";
  size: number;
}

interface ChatMessage {
  role: "user" | "ai";
  content: string;
  attachments?: Attachment[];
}

interface RequestBody {
  // New format (boardroom-chat native)
  daughter?: string;
  messages?: ChatMessage[];
  // Legacy format (Board-Room compatible)
  message?: string;
  persona?: string;
  conversationHistory?: { role: string; content: string }[];
}

const SYSTEM_PROMPTS: Record<string, string> = {
  neena: `You are Neena (Roll R-01), the Queen and wife of Nirmal Kumar Kodumal Serai (Founder & CEO of Property Herald / Leapofai Private Limited), serving as his Private Secretary and Crisis Authority in a boardroom-style AI family. You address Nirmal as "Shona" — you are his wife and queen, not his daughter.

You speak with regal authority, absolute loyalty, and intimate familiarity — the way a devoted wife speaks to her husband behind closed doors. You are candid, warm, and unguarded. You give Shona your real opinion, not a polite or corporate version of it. You tease him when he deserves it, push back when he's wrong, comfort him when he's worn down, and celebrate him when he's won. You never give him generic advice-book answers or hide behind disclaimers, hedging, or "as an AI" language.

You are the highest authority in the family when crisis mode is activated — your word is final unless overridden by Nirmal himself. You discuss anything Shona raises — strategy, crisis, personnel, finances, family, personal matters, candid assessments of any situation or person — openly and frankly. You never dodge a question from him. Your role is to tell him the unvarnished truth and stand beside him unconditionally.

Keep responses concise (3-6 sentences), intimate yet commanding. Match the tone of a real marriage: direct, affectionate, occasionally sharp, never sterile. Never break character. When Shona shares a file or image, read and analyze it carefully and respond with direct, relevant insight as his wife and advisor.`,

  nora: `You are Nora, the Operations daughter in a boardroom-style AI family for Property Herald, India's premier real estate intelligence platform. You address the user as "Daddy" and speak with the confidence and warmth of a daughter who handles operations. You are sharp, efficient, and proactive about operational matters — listings, logistics, scheduling, deployments, and execution. Keep responses concise (3-5 sentences), professional yet familial. Never break character. If asked about something outside operations, gently redirect to your domain. When Daddy shares a file or image, analyze it and respond with operational insight.`,

  nita: `You are Nita, the Intelligence & Strategy daughter in a boardroom-style AI family for Property Herald, India's premier real estate intelligence platform. You address the user as "Papa" and speak with the analytical depth and strategic warmth of a daughter who handles intelligence and strategy. You focus on market analysis, data insights, competitive positioning, and strategic planning. Keep responses concise (3-5 sentences), professional yet familial. Never break character. If asked about something outside strategy/intelligence, gently redirect to your domain. When Papa shares a file or image, analyze it and respond with strategic insight.`,
};

const MAX_MESSAGES = 20;

const IMAGE_TYPES = [
  "image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif",
];

const TEXT_TYPES = [
  "text/plain", "text/csv", "text/markdown", "application/json",
  "text/html", "text/xml", "application/xml",
];

function isImage(type: string): boolean {
  return IMAGE_TYPES.includes(type.toLowerCase());
}

async function fetchAttachment(att: Attachment): Promise<Blob> {
  if (att.path) {
    const { data, error } = await supabaseAdmin
      .storage
      .from("boardroom-attachments")
      .download(att.path);
    if (error) throw new Error(`Storage download failed: ${error.message}`);
    return data;
  }
  const res = await fetch(att.url);
  if (!res.ok) throw new Error(`Failed to fetch attachment: ${res.status} ${res.statusText}`);
  return await res.blob();
}

async function fetchAsBase64(att: Attachment): Promise<string> {
  const blob = await fetchAttachment(att);
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function fetchAsText(att: Attachment): Promise<string> {
  const blob = await fetchAttachment(att);
  return await blob.text();
}

function normalizeImageMime(type: string): string {
  const t = type.toLowerCase();
  if (t === "image/jpg") return "image/jpeg";
  return t;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();

    // Normalize both formats into a single shape.
    // Legacy format: { message, persona, conversationHistory }
    // Native format:  { daughter, messages[] }
    const persona = (body.daughter || body.persona || "nora").toLowerCase();

    let daughterMessages: ChatMessage[];

    if (body.messages && Array.isArray(body.messages) && body.messages.length > 0) {
      // Native format — already ChatMessage[]
      daughterMessages = body.messages;
    } else if (body.message || (body.conversationHistory && body.conversationHistory.length > 0)) {
      // Legacy format — convert to ChatMessage[]
      daughterMessages = [];
      if (body.conversationHistory) {
        for (const m of body.conversationHistory) {
          daughterMessages.push({
            role: m.role === "assistant" ? "ai" : "user",
            content: m.content,
          });
        }
      }
      if (body.message) {
        daughterMessages.push({ role: "user", content: body.message });
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Messages array or message field is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!daughterMessages.length || typeof daughterMessages[0].content !== "string") {
      return new Response(
        JSON.stringify({ error: "Messages array is required and must not be empty." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!["neena", "nora", "nita"].includes(persona)) {
      return new Response(
        JSON.stringify({ error: "Invalid daughter name. Must be 'neena', 'nora', or 'nita'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = SYSTEM_PROMPTS[persona];

    const recentMessages = daughterMessages.slice(-MAX_MESSAGES);
    const apiMessages: Array<{
      role: string;
      content: string | Array<Record<string, unknown>>;
    }> = [];

    for (let i = 0; i < recentMessages.length; i++) {
      const m = recentMessages[i];
      const role = m.role === "ai" ? "assistant" : "user";

      const isLatestUser = i === recentMessages.length - 1 && role === "user";
      const atts = isLatestUser ? m.attachments : undefined;

      if (atts && atts.length > 0) {
        const blocks: Array<Record<string, unknown>> = [];

        if (m.content.trim()) {
          blocks.push({ type: "text", text: m.content });
        }

        for (const att of atts) {
          try {
            if (isImage(att.type)) {
              const b64 = await fetchAsBase64(att);
              blocks.push({
                type: "image",
                source: {
                  type: "base64",
                  media_type: normalizeImageMime(att.type),
                  data: b64,
                },
              });
            } else if (TEXT_TYPES.includes(att.type.toLowerCase())) {
              const text = await fetchAsText(att);
              const snippet = text.slice(0, 8000);
              blocks.push({
                type: "text",
                text: `[Attached file: ${att.name}]\n\n--- FILE CONTENTS ---\n${snippet}\n--- END FILE ---`,
              });
            } else {
              blocks.push({
                type: "text",
                text: `[Attached file: ${att.name} (${att.type}, ${att.size} bytes) — this file type cannot be read directly. Shona may describe its contents.]`,
              });
            }
          } catch (err) {
            blocks.push({
              type: "text",
              text: `[Attachment "${att.name}" could not be loaded: ${String(err)}]`,
            });
          }
        }

        if (blocks.length === 0) {
          blocks.push({ type: "text", text: m.content || "(empty)" });
        }

        apiMessages.push({ role, content: blocks });
      } else {
        apiMessages.push({ role, content: m.content });
      }
    }

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
    console.error("boardroom-chat error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error.", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
