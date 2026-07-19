import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import {
  Plus, Edit2, Trash2, Calendar, Users, Zap, AlertCircle, CheckCircle,
  X, Save, ChevronLeft, ChevronRight, Activity, Video,
} from 'lucide-react';

interface LiveEvent {
  id: string;
  title: string;
  event_date: string;
  duration_minutes: number;
  developer_slots_json: string[];
  buyer_registrations_json: string[];
  recording_url: string | null;
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  tokens_per_slot: number;
  max_developer_slots: number;
  created_at: string;
}

interface FormData {
  title: string;
  event_date: string;
  duration_minutes: string;
  tokens_per_slot: string;
  max_developer_slots: string;
  recording_url: string;
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
}

const INITIAL_FORM: FormData = {
  title: '',
  event_date: '',
  duration_minutes: '60',
  tokens_per_slot: '500',
  max_developer_slots: '8',
  recording_url: '',
  status: 'upcoming',
};

const STATUS_COLORS: Record<string, { badge: string; button: string; label: string }> = {
  upcoming: { badge: 'bg-blue-100 text-blue-700 border-blue-200', button: 'bg-blue-500 hover:bg-blue-600', label: 'Upcoming' },
  live: { badge: 'bg-green-100 text-green-700 border-green-200 animate-pulse', button: 'bg-green-500 hover:bg-green-600', label: 'Live' },
  completed: { badge: 'bg-gray-100 text-gray-700 border-gray-200', button: 'bg-gray-500 hover:bg-gray-600', label: 'Completed' },
  cancelled: { badge: 'bg-red-100 text-red-700 border-red-200', button: 'bg-red-500 hover:bg-red-600', label: 'Cancelled' },
};

const PAGE_SIZE = 10;

export function AdminLiveEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<LiveEvent | null>(null);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, upcoming: 0, developerSlots: 0, buyerRegistrations: 0 });
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, count, error: err } = await supabase
        .from('live_events')
        .select('*', { count: 'exact' })
        .order('event_date', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (err) throw err;

      const typedEvents = (data ?? []) as LiveEvent[];
      setEvents(typedEvents);
      setTotal(count ?? 0);

      // Calculate stats
      const allEvents = await supabase.from('live_events').select('*');
      if (allEvents.data) {
        const allData = allEvents.data as LiveEvent[];
        const totalDeveloperSlots = allData.reduce((sum, e) => sum + (e.developer_slots_json?.length ?? 0), 0);
        const totalBuyerRegs = allData.reduce((sum, e) => sum + (e.buyer_registrations_json?.length ?? 0), 0);
        const upcomingCount = allData.filter(e => e.status === 'upcoming').length;

        setStats({
          total: allData.length,
          upcoming: upcomingCount,
          developerSlots: totalDeveloperSlots,
          buyerRegistrations: totalBuyerRegs,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  function openCreateModal() {
    setEditingEvent(null);
    setFormData(INITIAL_FORM);
    setShowModal(true);
  }

  function openEditModal(event: LiveEvent) {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      event_date: event.event_date.slice(0, 16),
      duration_minutes: event.duration_minutes.toString(),
      tokens_per_slot: event.tokens_per_slot.toString(),
      max_developer_slots: event.max_developer_slots.toString(),
      recording_url: event.recording_url ?? '',
      status: event.status,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingEvent(null);
    setFormData(INITIAL_FORM);
  }

  async function handleSaveEvent() {
    if (!formData.title.trim() || !formData.event_date) {
      setError('Title and event date are required');
      return;
    }

    setActionLoading(editingEvent?.id ?? 'creating');
    try {
      const eventData = {
        title: formData.title.trim(),
        event_date: new Date(formData.event_date).toISOString(),
        duration_minutes: parseInt(formData.duration_minutes) || 60,
        tokens_per_slot: parseInt(formData.tokens_per_slot) || 500,
        max_developer_slots: parseInt(formData.max_developer_slots) || 8,
        recording_url: formData.recording_url.trim() || null,
        status: formData.status,
      };

      if (editingEvent) {
        const { error: err } = await supabase
          .from('live_events')
          .update(eventData)
          .eq('id', editingEvent.id);

        if (err) throw err;

        await logAdminAction(supabase, user!.email!, 'update_live_event', 'live_events', editingEvent.id, {
          title: formData.title,
          status: formData.status,
        });
      } else {
        const { error: err } = await supabase
          .from('live_events')
          .insert([
            {
              ...eventData,
              developer_slots_json: [],
              buyer_registrations_json: [],
            },
          ]);

        if (err) throw err;

        await logAdminAction(supabase, user!.email!, 'create_live_event', 'live_events', undefined, {
          title: formData.title,
        });
      }

      closeModal();
      fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteEvent(eventId: string) {
    setActionLoading(eventId);
    try {
      const event = events.find(e => e.id === eventId);
      const { error: err } = await supabase.from('live_events').delete().eq('id', eventId);

      if (err) throw err;

      await logAdminAction(supabase, user!.email!, 'delete_live_event', 'live_events', eventId, {
        title: event?.title,
      });

      setDeleteConfirm(null);
      fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleStatusChange(eventId: string, newStatus: LiveEvent['status']) {
    setActionLoading(eventId);
    try {
      const { error: err } = await supabase
        .from('live_events')
        .update({ status: newStatus })
        .eq('id', eventId);

      if (err) throw err;

      const event = events.find(e => e.id === eventId);
      await logAdminAction(supabase, user!.email!, 'update_event_status', 'live_events', eventId, {
        title: event?.title,
        newStatus,
      });

      fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  }

  const parsedEvents = events.map(e => ({
    ...e,
    developerCount: Array.isArray(e.developer_slots_json) ? e.developer_slots_json.length : 0,
    buyerCount: Array.isArray(e.buyer_registrations_json) ? e.buyer_registrations_json.length : 0,
  }));

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header with Create Button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif font-bold text-navy">LIVE Events Management</h2>
            <p className="text-sm text-gray-500 mt-1">Manage Property Herald LIVE events, slots, and registrations</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-6 py-3 bg-navy text-cream rounded-xl font-medium hover:bg-navy/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Event
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{error}</p>
              <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 underline text-xs mt-1">
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Events', value: stats.total, icon: Calendar, color: 'bg-blue-50 text-blue-600' },
            { label: 'Upcoming', value: stats.upcoming, icon: Activity, color: 'bg-amber-50 text-amber-600' },
            { label: 'Developer Slots Booked', value: stats.developerSlots, icon: Users, color: 'bg-green-50 text-green-600' },
            { label: 'Buyer Registrations', value: stats.buyerRegistrations, icon: Zap, color: 'bg-purple-50 text-purple-600' },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className={`p-5 rounded-xl border border-gray-100 ${stat.color}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">{stat.label}</p>
                    <p className="text-2xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <Icon className="w-8 h-8 opacity-20" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Events List */}
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
            ))
          ) : parsedEvents.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No events found. Create your first LIVE event.</p>
            </div>
          ) : (
            <>
              {parsedEvents.map(event => {
                const statusColor = STATUS_COLORS[event.status];
                const eventDate = new Date(event.event_date);
                const isLive = event.status === 'live';

                return (
                  <div key={event.id} className="bg-white border border-gray-100 rounded-xl p-6 hover:border-gray-200 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-3">
                          <h3 className="text-lg font-bold text-navy truncate">{event.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColor.badge}`}>
                            {isLive && <span className="inline-block w-2 h-2 bg-current rounded-full mr-1.5 animate-pulse" />}
                            {STATUS_COLORS[event.status].label}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Date & Time</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {eventDate.toLocaleDateString()} {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Duration</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">{event.duration_minutes} min</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Developer Slots</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {event.developerCount}/{event.max_developer_slots}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Buyers</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">{event.buyerCount}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{event.tokens_per_slot} tokens/slot</span>
                          {event.recording_url && (
                            <>
                              <span>•</span>
                              <Video className="w-3.5 h-3.5" />
                              <span>Recording available</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Status Quick Change */}
                        {event.status === 'upcoming' && (
                          <button
                            onClick={() => handleStatusChange(event.id, 'live')}
                            disabled={actionLoading === event.id}
                            className="px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === event.id ? '...' : 'Go Live'}
                          </button>
                        )}
                        {event.status === 'live' && (
                          <button
                            onClick={() => handleStatusChange(event.id, 'completed')}
                            disabled={actionLoading === event.id}
                            className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === event.id ? '...' : 'End Event'}
                          </button>
                        )}
                        {event.status === 'completed' && (
                          <button
                            onClick={() => handleStatusChange(event.id, 'cancelled')}
                            disabled={actionLoading === event.id}
                            className="px-3 py-1.5 bg-gray-400 text-white text-xs font-medium rounded-lg hover:bg-gray-500 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === event.id ? '...' : 'Cancel'}
                          </button>
                        )}

                        {/* Edit */}
                        <button
                          onClick={() => openEditModal(event)}
                          disabled={actionLoading === event.id}
                          className="px-3 py-1.5 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteConfirm(event.id)}
                          disabled={actionLoading === event.id}
                          className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Delete Confirmation */}
                    {deleteConfirm === event.id && (
                      <div className="mt-4 pt-4 border-t border-gray-100 bg-red-50 p-4 rounded-lg flex items-center justify-between">
                        <p className="text-sm text-red-700 font-medium">Delete this event permanently?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-4 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            disabled={actionLoading === event.id}
                            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === event.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Pagination */}
              {total > PAGE_SIZE && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Showing {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, total)} of {total} events
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0 || loading}
                      className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setPage(p => (page + 1) * PAGE_SIZE < total ? p + 1 : p)}
                      disabled={(page + 1) * PAGE_SIZE >= total || loading}
                      className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                <h3 className="text-xl font-bold text-navy">
                  {editingEvent ? 'Edit Event' : 'Create New Event'}
                </h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Event Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Q3 Developer Summit"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Event Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.event_date}
                    onChange={e => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Duration (minutes)</label>
                    <input
                      type="number"
                      min="15"
                      max="480"
                      value={formData.duration_minutes}
                      onChange={e => setFormData({ ...formData, duration_minutes: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Tokens per Slot</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.tokens_per_slot}
                      onChange={e => setFormData({ ...formData, tokens_per_slot: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Max Developer Slots</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.max_developer_slots}
                      onChange={e => setFormData({ ...formData, max_developer_slots: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as FormData['status'] })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="live">Live</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Recording URL (for completed events)</label>
                  <input
                    type="url"
                    value={formData.recording_url}
                    onChange={e => setFormData({ ...formData, recording_url: e.target.value })}
                    placeholder="https://example.com/recording"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={closeModal}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEvent}
                  disabled={actionLoading === (editingEvent?.id ?? 'creating')}
                  className="flex items-center gap-2 px-6 py-2.5 bg-navy text-cream font-medium rounded-lg hover:bg-navy/90 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {actionLoading === (editingEvent?.id ?? 'creating') ? 'Saving...' : 'Save Event'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
