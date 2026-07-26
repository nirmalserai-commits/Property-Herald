import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BoardroomRow {
  id: string;
  role: "user" | "assistant";
  content: string;
  session_id: string;
  session_summary: string | null;
  created_at: string;
}

const RECIPIENT = "nirmalserai@gmail.com";
const SENDER = "Neena Digest <onboarding@resend.dev>";

function fmtIST(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }) + " IST";
}

function dateStampIST(d: Date): string {
  const y = d.toLocaleString("en-CA", { timeZone: "Asia/Kolkata", year: "numeric" });
  const m = d.toLocaleString("en-CA", { timeZone: "Asia/Kolkata", month: "2-digit" });
  const day = d.toLocaleString("en-CA", { timeZone: "Asia/Kolkata", day: "2-digit" });
  return `${y}-${m}-${day}`;
}

function buildMarkdown(rows: BoardroomRow[], runDate: Date): string {
  const lines: string[] = [];
  const dateStr = dateStampIST(runDate);
  const total = rows.length;
  const sessions = new Set(rows.map((r) => r.session_id)).size;

  lines.push(`# Neena — Complete Chat Backup`);
  lines.push(``);
  lines.push(`**Backup generated:** ${fmtIST(runDate.toISOString())}`);
  lines.push(`**Recipient:** ${RECIPIENT}`);
  lines.push(`**Total messages:** ${total}`);
  lines.push(`**Sessions:** ${sessions}`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  if (total === 0) {
    lines.push(`_No Neena messages found in the database._`);
    lines.push(``);
    return lines.join("\n");
  }

  let currentSession = "";
  let sessionIdx = 0;

  for (const r of rows) {
    if (r.session_id !== currentSession) {
      currentSession = r.session_id;
      sessionIdx += 1;
      lines.push(`## Session ${sessionIdx}`);
      lines.push(``);
      lines.push(`_Session ID: ${r.session_id}_`);
      lines.push(``);
    }

    const who = r.role === "user" ? "Nirmal" : "Neena";
    const ts = fmtIST(r.created_at);
    lines.push(`**${who}** — _${ts}_`);
    lines.push(``);
    lines.push(r.content);
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(`_End of backup. Generated automatically by Property Herald nightly digest._`);

  return lines.join("\n");
}

function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function getResendApiKey(supabaseUrl: string, serviceKey: string): Promise<string | null> {
  // Try environment variable first (set via Supabase secrets management)
  const envKey = Deno.env.get("RESEND_API_KEY");
  if (envKey) return envKey;

  // Fall back to vault secret stored in the database
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_vault_secret`,
      {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ secret_name: "RESEND_API_KEY" }),
      },
    );
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === "string" && data.length > 0) return data;
    }
  } catch {
    // vault read failed
  }
  return null;
}

async function sendEmail(
  markdown: string,
  filename: string,
  messageCount: number,
  supabaseUrl: string,
  serviceKey: string,
): Promise<{ id?: string; skipped?: boolean; error?: string }> {
  const apiKey = await getResendApiKey(supabaseUrl, serviceKey);
  if (!apiKey) {
    return { skipped: true };
  }

  const subject = `Neena Daily Backup — ${dateStampIST(new Date())} (${messageCount} messages)`;

  const body = {
    from: SENDER,
    to: [RECIPIENT],
    subject,
    text: `Daily full backup of all Neena chat messages is attached as ${filename}.\n\nTotal messages: ${messageCount}\n\nThis is an automated mandatory daily backup from Property Herald.`,
    attachments: [
      {
        filename,
        content: toBase64(markdown),
      },
    ],
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    return { error: `Resend API error ${res.status}: ${errText}` };
  }

  const data = await res.json();
  return { id: data.id as string | undefined };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const logId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const adminHeaders = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };

  const fail = async (message: string) => {
    console.error("daily-neena-digest failed:", message);
    await fetch(`${SUPABASE_URL}/rest/v1/neena_digest_log?id=eq.${logId}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({
        status: "failed",
        error_message: message,
        sent_at: new Date().toISOString(),
      }),
    }).catch(() => {});
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  };

  try {
    // Insert a pending log row
    await fetch(`${SUPABASE_URL}/rest/v1/neena_digest_log`, {
      method: "POST",
      headers: { ...adminHeaders, Prefer: "return=representation" },
      body: JSON.stringify({ id: logId, started_at: startedAt, status: "pending" }),
    });

    // Fetch ALL Neena messages, ordered by time
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/boardroom_chats?daughter_name=eq.neena&order=created_at.asc&select=id,role,content,session_id,session_summary,created_at`,
      { headers: adminHeaders },
    );

    if (!res.ok) {
      return await fail(`Database query failed: ${res.status} ${await res.text()}`);
    }

    const rows = (await res.json()) as BoardroomRow[];
    const runDate = new Date();
    const filename = `neena-backup-${dateStampIST(runDate)}.md`;
    const markdown = buildMarkdown(rows, runDate);

    const result = await sendEmail(markdown, filename, rows.length, SUPABASE_URL, SUPABASE_SERVICE_KEY);
    if (result.error) {
      return await fail(result.error);
    }

    const sessionCount = new Set(rows.map((r) => r.session_id)).size;
    const skipped = result.skipped === true;
    await fetch(`${SUPABASE_URL}/rest/v1/neena_digest_log?id=eq.${logId}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({
        status: skipped ? "skipped" : "success",
        sent_at: new Date().toISOString(),
        message_count: rows.length,
        session_count: sessionCount,
        attachment_filename: filename,
        resend_id: result.id ?? null,
        error_message: skipped ? "RESEND_API_KEY not set — email skipped, data backed up." : null,
      }),
    });

    return new Response(
      JSON.stringify(skipped ? {
        success: true,
        skipped: true,
        message_count: rows.length,
        session_count: sessionCount,
        filename,
        note: "RESEND_API_KEY not set — email skipped, data backed up.",
      } : {
        success: true,
        message_count: rows.length,
        session_count: sessionCount,
        filename,
        resend_id: result.id ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return await fail(String(err));
  }
});
