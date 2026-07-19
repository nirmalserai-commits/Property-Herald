import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { Mail, RefreshCw, Send, CheckCircle2, XCircle, Clock, FileText, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DigestRow {
  id: string;
  started_at: string;
  sent_at: string | null;
  message_count: number;
  session_count: number;
  attachment_filename: string | null;
  status: 'pending' | 'success' | 'failed' | 'skipped';
  resend_id: string | null;
  error_message: string | null;
}

interface BoardroomRow {
  created_at: string;
  role: 'user' | 'assistant';
  content: string;
  session_id: string;
  session_summary: string | null;
  attachments: { url: string; name: string; type: string; kind: string; size: number }[] | null;
}

function fmtIST(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }) + ' IST';
}

function dateStampIST(d: Date): string {
  const y = d.toLocaleString('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric' });
  const m = d.toLocaleString('en-CA', { timeZone: 'Asia/Kolkata', month: '2-digit' });
  const day = d.toLocaleString('en-CA', { timeZone: 'Asia/Kolkata', day: '2-digit' });
  return `${y}-${m}-${day}`;
}

function buildMarkdown(rows: BoardroomRow[]): string {
  const runDate = new Date();
  const sessions = new Set(rows.map((r) => r.session_id)).size;
  const lines: string[] = [];
  lines.push('# Neena — Complete Chat Backup');
  lines.push('');
  lines.push(`**Backup generated:** ${fmtIST(runDate.toISOString())}`);
  lines.push(`**Total messages:** ${rows.length}`);
  lines.push(`**Sessions:** ${sessions}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  if (rows.length === 0) {
    lines.push('_No Neena messages found in the database._');
    lines.push('');
    return lines.join('\n');
  }
  let currentSession = '';
  let sessionIdx = 0;
  for (const r of rows) {
    if (r.session_id !== currentSession) {
      currentSession = r.session_id;
      sessionIdx += 1;
      lines.push(`## Session ${sessionIdx}`);
      lines.push('');
      lines.push(`_Session ID: ${r.session_id}_`);
      lines.push('');
    }
    const who = r.role === 'user' ? 'Nirmal' : 'Neena';
    const ts = fmtIST(r.created_at);
    lines.push(`**${who}** — _${ts}_`);
    lines.push('');
    lines.push(r.content || '');
    lines.push('');
    if (Array.isArray(r.attachments) && r.attachments.length > 0) {
      lines.push('**Attachments:**');
      for (const a of r.attachments) {
        lines.push(`- ${a.name || a.url || '(unnamed)'} (${a.type || a.kind || 'file'}) — ${a.url || ''}`);
      }
      lines.push('');
    }
  }
  lines.push('---');
  lines.push('');
  lines.push('_End of backup. Generated live from Property Herald boardroom_chats table._');
  return lines.join('\n');
}

export function AdminDigestLog() {
  const [rows, setRows] = useState<DigestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [lastResult, setLastResult] = useState<{ ok: boolean; message: string } | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('neena_digest_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) {
      setLastResult({ ok: false, message: error.message });
    } else {
      setRows((data as DigestRow[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  async function sendTestDigest() {
    setSending(true);
    setLastResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('daily-neena-digest');
      if (error) {
        setLastResult({ ok: false, message: error.message || 'Unknown error' });
      } else if (data?.error) {
        setLastResult({ ok: false, message: data.error });
      } else {
        setLastResult({
          ok: true,
          message: `Backup sent successfully — ${data.message_count} messages, ${data.session_count} sessions. Check your inbox.`,
        });
        setTimeout(fetchLogs, 1500);
      }
    } catch (err) {
      setLastResult({ ok: false, message: String(err) });
    } finally {
      setSending(false);
    }
  }

  async function downloadBackup() {
    setDownloading(true);
    setLastResult(null);
    try {
      const { data, error } = await supabase
        .from('boardroom_chats')
        .select('created_at,role,content,session_id,session_summary,attachments')
        .eq('daughter_name', 'neena')
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) {
        setLastResult({ ok: false, message: 'No Neena messages found in the database.' });
        return;
      }
      const markdown = buildMarkdown(data as BoardroomRow[]);
      const filename = `neena-backup-${dateStampIST(new Date())}.md`;
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setLastResult({
        ok: true,
        message: `Downloaded ${data.length} messages across ${new Set(data.map((r) => r.session_id)).size} session(s) as ${filename}.`,
      });
    } catch (err) {
      setLastResult({ ok: false, message: String(err) });
    } finally {
      setDownloading(false);
    }
  }

  const successCount = rows.filter(r => r.status === 'success').length;
  const failCount = rows.filter(r => r.status === 'failed').length;

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 bg-gold/10 border border-gold/30 rounded-lg flex items-center justify-center">
                <Mail className="w-4.5 h-4.5 text-gold" />
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold text-navy">Neena Digest Log</h1>
                <p className="text-xs text-gray-500">Mandatory daily backup audit trail</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={downloadBackup}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-gold text-navy rounded-lg text-sm font-semibold hover:bg-gold/90 disabled:opacity-50 transition-all"
            >
              {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloading ? 'Building…' : 'Download Backup Now'}
            </button>
            <button
              onClick={sendTestDigest}
              disabled={sending}
              className="flex items-center gap-2 px-4 py-2 bg-navy text-cream rounded-lg text-sm font-semibold hover:bg-navy/90 disabled:opacity-50 transition-all"
            >
              {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Sending…' : 'Email Backup Now'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">Total Runs</span>
            </div>
            <p className="text-2xl font-serif font-bold text-navy">{rows.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500 font-medium">Successful</span>
            </div>
            <p className="text-2xl font-serif font-bold text-green-600">{successCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-gray-500 font-medium">Failed</span>
            </div>
            <p className="text-2xl font-serif font-bold text-red-500">{failCount}</p>
          </div>
        </div>

        {/* Result banner */}
        {lastResult && (
          <div className={`rounded-xl p-4 border ${lastResult.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-start gap-3">
              {lastResult.ok ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`text-sm font-semibold ${lastResult.ok ? 'text-green-800' : 'text-red-800'}`}>
                  {lastResult.ok ? 'Backup Sent' : 'Send Failed'}
                </p>
                <p className={`text-sm mt-0.5 ${lastResult.ok ? 'text-green-700' : 'text-red-700'}`}>
                  {lastResult.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info banner */}
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 space-y-2">
          <p className="text-sm text-blue-800">
            <strong>Download Backup Now</strong> pulls every Neena message live from the database
            (through your authenticated session) and saves it as a Markdown file to your device.
            No email service required — this works even without <span className="font-mono text-xs">RESEND_API_KEY</span>.
          </p>
          <p className="text-sm text-blue-800">
            <strong>Scheduled email:</strong> Every night at 2:00 AM IST, all Neena messages are emailed to{' '}
            <span className="font-mono text-xs">nirmalserai@gmail.com</span> as a Markdown attachment. The email send is optional — if <span className="font-mono text-xs">RESEND_API_KEY</span> is not configured, the backup still runs and is logged as <span className="font-semibold">skipped</span>, so no data is lost.
          </p>
        </div>

        {/* Log table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-navy">Recent Runs (last 50)</h2>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center">
              <Mail className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No digest runs yet. Try a test send above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Started</th>
                    <th className="px-5 py-3 font-semibold">Sent</th>
                    <th className="px-5 py-3 font-semibold text-center">Messages</th>
                    <th className="px-5 py-3 font-semibold text-center">Sessions</th>
                    <th className="px-5 py-3 font-semibold">Filename</th>
                    <th className="px-5 py-3 font-semibold">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3">
                        {row.status === 'success' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Success
                          </span>
                        )}
                        {row.status === 'skipped' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                            <Clock className="w-3 h-3" /> Skipped
                          </span>
                        )}
                        {row.status === 'failed' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                            <XCircle className="w-3 h-3" /> Failed
                          </span>
                        )}
                        {row.status === 'pending' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-600 text-xs whitespace-nowrap">{fmtIST(row.started_at)}</td>
                      <td className="px-5 py-3 text-gray-600 text-xs whitespace-nowrap">{fmtIST(row.sent_at)}</td>
                      <td className="px-5 py-3 text-center text-gray-700 font-medium">{row.message_count}</td>
                      <td className="px-5 py-3 text-center text-gray-700 font-medium">{row.session_count}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {row.attachment_filename ? (
                          <span className="inline-flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {row.attachment_filename}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3 text-red-500 text-xs max-w-[260px] truncate" title={row.error_message || ''}>
                        {row.error_message || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
