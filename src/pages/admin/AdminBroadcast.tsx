import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import type { NotificationType, NotificationAudience } from '../../types/database';
import { Bell, Send, CheckCircle, Info, AlertTriangle, XCircle } from 'lucide-react';

const TYPE_OPTIONS: { value: NotificationType; label: string; icon: typeof Info; color: string }[] = [
  { value: 'info', label: 'Info', icon: Info, color: 'text-blue-500 bg-blue-50 border-blue-200' },
  { value: 'success', label: 'Success', icon: CheckCircle, color: 'text-gold bg-gold/5 border-gold/30' },
  { value: 'warning', label: 'Warning', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'error', label: 'Urgent', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' },
];

const AUDIENCE_OPTIONS: { value: NotificationAudience; label: string; desc: string }[] = [
  { value: 'all', label: 'All Users', desc: 'Every registered user sees this' },
  { value: 'verified', label: 'Verified Users Only', desc: 'Only users with verified badge' },
  { value: 'unverified', label: 'Unverified Users Only', desc: 'Users without verification' },
];

export function AdminBroadcast() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotificationType>('info');
  const [audience, setAudience] = useState<NotificationAudience>('all');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = TYPE_OPTIONS.find(t => t.value === type)!;
  const PreviewIcon = preview.icon;

  async function handleSend() {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    setError(null);

    const { error: err } = await supabase.from('notifications').insert({
      user_id: null,
      title: title.trim(),
      message: message.trim(),
      type,
      audience,
      is_read: false,
    });

    if (err) {
      setError(err.message);
      setSending(false);
      return;
    }

    await logAdminAction(supabase, user!.email!, 'broadcast_notification', 'notifications', undefined, { title, type, audience });
    setSending(false);
    setSent(true);
    setTitle('');
    setMessage('');
    setType('info');
    setAudience('all');
    setTimeout(() => setSent(false), 4000);
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-8">
        {sent && (
          <div className="flex items-center gap-3 px-4 py-3 bg-gold/5 border border-gold/30 rounded-xl text-sm text-gold">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Notification broadcast sent successfully to {AUDIENCE_OPTIONS.find(a => a.value === audience)?.label}.
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <XCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
            <Bell className="w-5 h-5 text-gray-400" />
            <div>
              <h2 className="font-serif font-bold text-navy">Compose Broadcast</h2>
              <p className="text-sm text-gray-400 mt-0.5">Sends an in-app notification banner to selected users</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Notification type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Notification Type</label>
              <div className="grid grid-cols-4 gap-2">
                {TYPE_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button key={opt.value} onClick={() => setType(opt.value)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${type === opt.value ? opt.color + ' ring-2 ring-offset-1 ring-current/30' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                      <Icon className="w-4 h-4" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Audience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Audience</label>
              <div className="space-y-2">
                {AUDIENCE_OPTIONS.map(opt => (
                  <label key={opt.value} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${audience === opt.value ? 'border-navy bg-navy/3' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="audience" value={opt.value} checked={audience === opt.value} onChange={() => setAudience(opt.value)} className="text-navy" />
                    <div>
                      <p className="font-medium text-navy text-sm">{opt.label}</p>
                      <p className="text-xs text-gray-400">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. System Maintenance Scheduled"
                maxLength={100}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              />
              <p className="text-xs text-gray-400 mt-1">{title.length}/100</p>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="Compose your notification message here..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">{message.length}/500</p>
            </div>

            {/* Preview */}
            {(title || message) && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Preview</p>
                <div className={`flex items-start gap-3 px-4 py-3 border rounded-xl ${preview.color}`}>
                  <PreviewIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    {title && <p className="font-semibold text-sm">{title}</p>}
                    {message && <p className="text-sm mt-0.5">{message}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={!title.trim() || !message.trim() || sending}
              className="w-full flex items-center justify-center gap-2 py-3 bg-navy text-cream rounded-xl font-display font-semibold disabled:opacity-40 hover:bg-navy/90 transition-colors"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Sending...' : `Send to ${AUDIENCE_OPTIONS.find(a => a.value === audience)?.label}`}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
