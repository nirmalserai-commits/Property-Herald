import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { Share2, Send, Copy, Check, CheckCircle, XCircle, Trash2, Clock } from 'lucide-react';

// limit = typical text limit used only for a soft warning. 0 = no check.
interface PlatformDef {
  key: string;
  label: string;
  mode: 'auto' | 'manual';
  limit: number;
}

const PLATFORMS: PlatformDef[] = [
  { key: 'linkedin', label: 'LinkedIn', mode: 'auto', limit: 3000 },
  { key: 'facebook', label: 'Facebook', mode: 'auto', limit: 5000 },
  { key: 'instagram', label: 'Instagram', mode: 'auto', limit: 2200 },
  { key: 'threads', label: 'Threads', mode: 'auto', limit: 500 },
  { key: 'youtube', label: 'YouTube', mode: 'auto', limit: 5000 },
  { key: 'telegram', label: 'Telegram', mode: 'auto', limit: 4096 },
  { key: 'pinterest', label: 'Pinterest', mode: 'auto', limit: 500 },
  { key: 'reddit', label: 'Reddit', mode: 'auto', limit: 10000 },
  { key: 'x', label: 'X', mode: 'manual', limit: 280 },
  { key: 'snapchat', label: 'Snapchat', mode: 'manual', limit: 0 },
  { key: 'whatsapp_channel', label: 'WhatsApp Channel', mode: 'manual', limit: 0 },
  { key: 'sharechat', label: 'ShareChat', mode: 'manual', limit: 0 },
  { key: 'moj', label: 'Moj', mode: 'manual', limit: 0 },
  { key: 'josh', label: 'Josh', mode: 'manual', limit: 0 },
  { key: 'quora', label: 'Quora', mode: 'manual', limit: 0 },
];

const REGIONS = ['Maharashtra', 'Gujarat', 'Karnataka', 'All regions'];

interface PostTarget {
  id: string;
  post_id: string;
  platform: string;
  status: string;
  error: string | null;
}

interface SocialPost {
  id: string;
  source_type: string;
  region: string | null;
  title: string | null;
  body: string;
  link_url: string | null;
  media_url: string | null;
  media_type: string | null;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  social_post_targets: PostTarget[];
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  pending_approval: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-blue-50 text-blue-700 border-blue-200',
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  published: 'bg-green-50 text-green-700 border-green-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  queued: 'bg-gray-50 text-gray-600 border-gray-200',
  sent: 'bg-green-50 text-green-700 border-green-200',
  manual_ready: 'bg-amber-50 text-amber-700 border-amber-200',
  manual_done: 'bg-green-50 text-green-700 border-green-200',
};

const TARGET_LABEL: Record<string, string> = {
  queued: 'waiting',
  sent: 'sent',
  failed: 'failed',
  manual_ready: 'post by hand',
  manual_done: 'posted',
};

type Filter = 'all' | 'draft' | 'scheduled' | 'manual';

function platformLabel(key: string): string {
  return PLATFORMS.find(p => p.key === key)?.label ?? key;
}

function fullText(post: SocialPost): string {
  const parts = [post.body.trim()];
  if (post.link_url && post.link_url.trim()) parts.push(post.link_url.trim());
  return parts.join('\n\n');
}

export function AdminSocialPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'' | 'image' | 'video'>('');
  const [region, setRegion] = useState(REGIONS[0]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('social_posts')
      .select('*, social_post_targets(*)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (err) {
      setError(err.message);
    } else {
      setPosts((data ?? []) as SocialPost[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  }

  function togglePlatform(key: string) {
    setSelected(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  }

  function selectGroup(mode: 'auto' | 'manual') {
    const keys = PLATFORMS.filter(p => p.mode === mode).map(p => p.key);
    setSelected(prev => Array.from(new Set([...prev, ...keys])));
  }

  const overLimit = useMemo(() => {
    const text = [body.trim(), linkUrl.trim()].filter(Boolean).join('\n\n');
    return PLATFORMS.filter(p => selected.includes(p.key) && p.limit > 0 && text.length > p.limit);
  }, [body, linkUrl, selected]);

  async function createPost(approveNow: boolean) {
    if (!body.trim()) {
      setError('Write the post text first.');
      return;
    }
    if (selected.length === 0) {
      setError('Pick at least one platform.');
      return;
    }
    setBusy(true);
    setError(null);

    const scheduleIso = scheduledAt ? new Date(scheduledAt).toISOString() : null;
    const status = approveNow ? (scheduleIso ? 'scheduled' : 'approved') : 'draft';

    const { data: post, error: postErr } = await supabase
      .from('social_posts')
      .insert({
        source_type: mediaType === 'video' ? 'video' : 'manual',
        region,
        title: title.trim() || null,
        body: body.trim(),
        link_url: linkUrl.trim() || null,
        media_url: mediaUrl.trim() || null,
        media_type: mediaUrl.trim() ? (mediaType || null) : null,
        status,
        scheduled_at: scheduleIso,
        approved_at: approveNow ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (postErr || !post) {
      setError(postErr?.message ?? 'Could not save the post.');
      setBusy(false);
      return;
    }

    const targets = selected.map(key => ({
      post_id: post.id as string,
      platform: key,
      status: PLATFORMS.find(p => p.key === key)?.mode === 'manual' ? 'manual_ready' : 'queued',
    }));
    const { error: tErr } = await supabase.from('social_post_targets').insert(targets);
    if (tErr) {
      setError(tErr.message);
      setBusy(false);
      return;
    }

    await logAdminAction(supabase, user!.email!, approveNow ? 'social_post_approve' : 'social_post_draft', 'social_posts', post.id as string, { platforms: selected });
    setTitle('');
    setBody('');
    setLinkUrl('');
    setMediaUrl('');
    setMediaType('');
    setScheduledAt('');
    setSelected([]);
    setBusy(false);
    flash(approveNow ? 'Post approved and queued.' : 'Draft saved.');
    load();
  }

  async function setPostStatus(post: SocialPost, status: string) {
    setError(null);
    const patch: Record<string, unknown> = { status };
    if (status === 'approved' || status === 'scheduled') patch.approved_at = new Date().toISOString();
    const { error: err } = await supabase.from('social_posts').update(patch).eq('id', post.id);
    if (err) {
      setError(err.message);
      return;
    }
    await logAdminAction(supabase, user!.email!, `social_post_${status}`, 'social_posts', post.id);
    load();
  }

  function approve(post: SocialPost) {
    setPostStatus(post, post.scheduled_at ? 'scheduled' : 'approved');
  }

  async function deletePost(post: SocialPost) {
    if (!window.confirm('Delete this post and its platform entries?')) return;
    const { error: err } = await supabase.from('social_posts').delete().eq('id', post.id);
    if (err) {
      setError(err.message);
      return;
    }
    await logAdminAction(supabase, user!.email!, 'social_post_delete', 'social_posts', post.id);
    load();
  }

  async function copyText(post: SocialPost, target: PostTarget) {
    try {
      await navigator.clipboard.writeText(fullText(post));
      setCopiedId(target.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      setError('Copy did not work in this browser. Select the text and copy it by hand.');
    }
  }

  async function markDone(post: SocialPost, target: PostTarget) {
    const { error: err } = await supabase
      .from('social_post_targets')
      .update({ status: 'manual_done', published_at: new Date().toISOString() })
      .eq('id', target.id);
    if (err) {
      setError(err.message);
      return;
    }
    const others = post.social_post_targets.filter(t => t.id !== target.id);
    const allDone = others.every(t => t.status === 'manual_done' || t.status === 'sent');
    if (allDone) {
      await supabase.from('social_posts').update({ status: 'published' }).eq('id', post.id);
    }
    load();
  }

  const visible = posts.filter(p => {
    if (filter === 'draft') return p.status === 'draft';
    if (filter === 'scheduled') return p.status === 'approved' || p.status === 'scheduled';
    if (filter === 'manual') return p.social_post_targets.some(t => t.status === 'manual_ready');
    return true;
  });

  return (
    <AdminLayout>
      <div className="max-w-5xl space-y-8">
        {notice && (
          <div className="flex items-center gap-3 px-4 py-3 bg-gold/5 border border-gold/30 rounded-xl text-sm text-gold">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />{notice}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <XCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          Auto-publishing is not connected yet. Approved posts wait in this queue. Platforms marked
          "by hand" are posted manually: copy the text, post it, then tap Mark posted.
        </div>

        {/* Compose */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
            <Share2 className="w-5 h-5 text-gray-400" />
            <div>
              <h2 className="font-serif font-bold text-navy">New Post</h2>
              <p className="text-sm text-gray-400 mt-0.5">Write once, choose platforms, approve</p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Region</label>
                <select
                  value={region}
                  onChange={e => setRegion(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                >
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title (optional, for your reference)</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={120}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Post text</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={5}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
                placeholder="Short summary in our own words, source named"
              />
              <p className="text-xs text-gray-400 mt-1">{body.length} characters</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Link (newsletter or page)</label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  placeholder="https://propertyherald.in/..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Schedule for (optional)</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Image or video link (optional)</label>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={e => setMediaUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Media type</label>
                <select
                  value={mediaType}
                  onChange={e => setMediaType(e.target.value as '' | 'image' | 'video')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                >
                  <option value="">None</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Platforms</label>
                <div className="flex gap-3 text-xs">
                  <button type="button" onClick={() => selectGroup('auto')} className="text-navy underline">Select all auto</button>
                  <button type="button" onClick={() => selectGroup('manual')} className="text-navy underline">Select all by hand</button>
                  <button type="button" onClick={() => setSelected([])} className="text-gray-400 underline">Clear</button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map(p => (
                  <label
                    key={p.key}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-sm transition-all ${
                      selected.includes(p.key) ? 'border-navy bg-navy/5' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input type="checkbox" checked={selected.includes(p.key)} onChange={() => togglePlatform(p.key)} />
                    <span className="text-navy font-medium">{p.label}</span>
                    <span className="ml-auto text-xs text-gray-400">{p.mode === 'auto' ? 'auto' : 'by hand'}</span>
                  </label>
                ))}
              </div>
              {overLimit.length > 0 && (
                <p className="text-xs text-amber-700 mt-2">
                  Text may be too long for: {overLimit.map(p => `${p.label} (${p.limit})`).join(', ')}. Shorten it or untick those platforms.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => createPost(true)}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-navy text-cream rounded-xl font-display font-semibold disabled:opacity-40 hover:bg-navy/90 transition-colors"
              >
                <Send className="w-4 h-4" />
                {busy ? 'Saving...' : scheduledAt ? 'Approve and schedule' : 'Approve and queue'}
              </button>
              <button
                onClick={() => createPost(false)}
                disabled={busy}
                className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Save draft
              </button>
            </div>
          </div>
        </div>

        {/* Queue */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif font-bold text-navy text-lg">Post Queue</h2>
            <div className="flex gap-2">
              {([
                ['all', 'All'],
                ['draft', 'Drafts'],
                ['scheduled', 'Approved'],
                ['manual', 'Needs posting by hand'],
              ] as [Filter, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    filter === key ? 'bg-navy text-cream border-navy' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : visible.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center text-sm text-gray-400">
              Nothing here yet.
            </div>
          ) : (
            <div className="space-y-4">
              {visible.map(post => {
                const approved = post.status === 'approved' || post.status === 'scheduled' || post.status === 'published';
                return (
                  <div key={post.id} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLE[post.status] ?? STATUS_STYLE.draft}`}>
                            {post.status}
                          </span>
                          {post.region && <span className="text-xs text-gray-400">{post.region}</span>}
                          {post.scheduled_at && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />
                              {new Date(post.scheduled_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                        {post.title && <p className="font-semibold text-navy text-sm mt-2">{post.title}</p>}
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{post.body}</p>
                        {post.link_url && <p className="text-xs text-blue-600 mt-1 break-all">{post.link_url}</p>}
                        {post.media_url && (
                          <p className="text-xs text-gray-400 mt-1 break-all">
                            {post.media_type ?? 'media'}: {post.media_url}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {(post.status === 'draft' || post.status === 'rejected') && (
                          <button onClick={() => approve(post)} className="px-3 py-1.5 bg-navy text-cream rounded-lg text-xs font-medium">
                            Approve
                          </button>
                        )}
                        {approved && post.status !== 'published' && (
                          <button onClick={() => setPostStatus(post, 'draft')} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600">
                            Back to draft
                          </button>
                        )}
                        {post.status === 'draft' && (
                          <button onClick={() => setPostStatus(post, 'rejected')} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600">
                            Reject
                          </button>
                        )}
                        <button onClick={() => deletePost(post)} className="p-1.5 text-gray-400 hover:text-red-500" aria-label="Delete post">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {post.social_post_targets.map(t => (
                        <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-100 bg-gray-50/50">
                          <span className="text-xs font-medium text-navy">{platformLabel(t.platform)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_STYLE[t.status] ?? STATUS_STYLE.queued}`}>
                            {TARGET_LABEL[t.status] ?? t.status}
                          </span>
                          {approved && t.status === 'manual_ready' && (
                            <>
                              <button onClick={() => copyText(post, t)} className="flex items-center gap-1 text-xs text-navy underline">
                                {copiedId === t.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copiedId === t.id ? 'Copied' : 'Copy text'}
                              </button>
                              <button onClick={() => markDone(post, t)} className="text-xs text-green-700 underline">
                                Mark posted
                              </button>
                            </>
                          )}
                          {t.error && <span className="text-xs text-red-600">{t.error}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
