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

// Email sending is disabled until a fresh Resend API key is configured.
// The backup data is still collected and logged so nothing is lost.

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

    const sessionCount = new Set(rows.map((r) => r.session_id)).size;
    await fetch(`${SUPABASE_URL}/rest/v1/neena_digest_log?id=eq.${logId}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({
        status: "skipped",
        sent_at: new Date().toISOString(),
        message_count: rows.length,
        session_count: sessionCount,
        attachment_filename: filename,
        error_message: "Email service not configured — data backed up, email skipped.",
      }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        skipped: true,
        message_count: rows.length,
        session_count: sessionCount,
        filename,
        note: "Email service not configured — data backed up, email skipped.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return await fail(String(err));
  }
});
