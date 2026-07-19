import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import {
  Heart, Plus, Edit, Trash2, Search, ChevronRight, X, AlertCircle, Clock,
  MapPin, Home, DollarSign, Bell, Eye, MoreVertical
} from 'lucide-react';

interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  filters_json: {
    city: string;
    property_type: string;
    deal_type: string;
    budget_min: number | null;
    budget_max: number | null;
  };
  alert_frequency: 'instant' | 'daily' | 'weekly';
  last_alerted_at: string | null;
  active: boolean;
  created_at: string;
}

const CITIES = ['Mumbai', 'Thane', 'Navi Mumbai', 'Pune', 'Hyderabad', 'Bengaluru', 'NCR', 'Ahmedabad', 'Chennai', 'All'];
const PROPERTY_TYPES = ['apartment', 'villa', 'plot', 'commercial', 'all'];
const DEAL_TYPES = ['sale', 'rent', 'all'];

export function SavedSearchesPage() {
  const { user, loading: authLoading } = useAuth();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    property_type: 'all',
    deal_type: 'all',
    budget_min: '',
    budget_max: '',
    alert_frequency: 'daily' as const,
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchSearches();
  }, [user]);

  async function fetchSearches() {
    setLoading(true);
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    if (!error && data) setSearches(data as SavedSearch[]);
    setLoading(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.city) {
      alert('Please fill in name and city');
      return;
    }

    const filters_json = {
      city: formData.city,
      property_type: formData.property_type,
      deal_type: formData.deal_type,
      budget_min: formData.budget_min ? parseInt(formData.budget_min) : null,
      budget_max: formData.budget_max ? parseInt(formData.budget_max) : null,
    };

    const payload = {
      user_id: user!.id,
      name: formData.name.trim(),
      filters_json,
      alert_frequency: formData.alert_frequency,
      active: true,
    };

    if (editingId) {
      await supabase.from('saved_searches').update(payload).eq('id', editingId);
    } else {
      await supabase.from('saved_searches').insert(payload);
    }

    resetForm();
    fetchSearches();
  };

  const handleEdit = (search: SavedSearch) => {
    setEditingId(search.id);
    setFormData({
      name: search.name,
      city: search.filters_json.city,
      property_type: search.filters_json.property_type,
      deal_type: search.filters_json.deal_type,
      budget_min: search.filters_json.budget_min ? String(search.filters_json.budget_min) : '',
      budget_max: search.filters_json.budget_max ? String(search.filters_json.budget_max) : '',
      alert_frequency: search.alert_frequency,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('saved_searches').delete().eq('id', id);
    setDeleteConfirm(null);
    fetchSearches();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('saved_searches').update({ active: !active }).eq('id', id);
    fetchSearches();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      city: '',
      property_type: 'all',
      deal_type: 'all',
      budget_min: '',
      budget_max: '',
      alert_frequency: 'daily',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const formatBudget = (min: number | null, max: number | null) => {
    if (!min && !max) return 'No budget filter';
    if (min && !max) return `₹${(min / 10000000).toFixed(1)}Cr+`;
    if (!min && max) return `Up to ₹${(max / 10000000).toFixed(1)}Cr`;
    return `₹${(min / 10000000).toFixed(1)}Cr - ₹${(max / 10000000).toFixed(1)}Cr`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const activeCount = searches.filter(s => s.active).length;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <Layout>
      <div className="min-h-screen bg-cream">
        {/* Header */}
        <div className="bg-navy py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gold/20 rounded-xl flex items-center justify-center">
                  <Heart className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <h1 className="text-3xl font-serif font-bold text-cream">Saved Searches</h1>
                  <p className="text-cream/60 text-sm mt-1">Get smart alerts for your favorite property searches</p>
                </div>
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-3 bg-gold text-navy font-display font-bold rounded-xl hover:bg-gold-400 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                New Search
              </button>
            </div>

            {/* Active alerts badge */}
            {activeCount > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 bg-gold/10 border border-gold/30 rounded-xl">
                <Bell className="w-5 h-5 text-gold flex-shrink-0" />
                <span className="text-sm font-medium text-gold">
                  {activeCount} active {activeCount === 1 ? 'alert' : 'alerts'} • You'll receive notifications based on your frequency preferences
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Modal Form */}
          {showForm && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-lg font-serif font-bold text-navy">
                    {editingId ? 'Edit Saved Search' : 'Create New Search'}
                  </h2>
                  <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <X className="w-5 h-5 text-warm-gray" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {/* Search Name */}
                  <div>
                    <label className="block text-sm font-semibold text-navy mb-2">Search Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. 'Luxury Apartments in Mumbai'"
                      className="input-field w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 focus:border-gold/60 outline-none"
                      required
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-semibold text-navy mb-2">City *</label>
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="input-field w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 focus:border-gold/60 outline-none bg-white"
                      required
                    >
                      <option value="">Select City</option>
                      {CITIES.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Property Type */}
                  <div>
                    <label className="block text-sm font-semibold text-navy mb-3">Property Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {PROPERTY_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({ ...formData, property_type: type })}
                          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all capitalize border ${
                            formData.property_type === type
                              ? 'bg-navy text-cream border-navy'
                              : 'bg-gray-50 text-warm-gray border-gray-200 hover:border-navy/30'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Deal Type */}
                  <div>
                    <label className="block text-sm font-semibold text-navy mb-3">Deal Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {DEAL_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({ ...formData, deal_type: type })}
                          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all capitalize border ${
                            formData.deal_type === type
                              ? 'bg-navy text-cream border-navy'
                              : 'bg-gray-50 text-warm-gray border-gray-200 hover:border-navy/30'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Budget Range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-navy mb-2">Min Budget (₹)</label>
                      <input
                        type="number"
                        value={formData.budget_min}
                        onChange={(e) => setFormData({ ...formData, budget_min: e.target.value })}
                        placeholder="e.g. 50000000"
                        className="input-field w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 focus:border-gold/60 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-navy mb-2">Max Budget (₹)</label>
                      <input
                        type="number"
                        value={formData.budget_max}
                        onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                        placeholder="e.g. 200000000"
                        className="input-field w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 focus:border-gold/60 outline-none"
                      />
                    </div>
                  </div>

                  {/* Alert Frequency */}
                  <div>
                    <label className="block text-sm font-semibold text-navy mb-3">Alert Frequency</label>
                    <div className="space-y-2">
                      {(['instant', 'daily', 'weekly'] as const).map((freq) => (
                        <label key={freq} className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name="alert_frequency"
                            value={freq}
                            checked={formData.alert_frequency === freq}
                            onChange={(e) => setFormData({ ...formData, alert_frequency: e.target.value as any })}
                            className="w-4 h-4"
                          />
                          <div>
                            <p className="text-sm font-medium text-navy capitalize">{freq}</p>
                            <p className="text-xs text-warm-gray">
                              {freq === 'instant' && 'Get notified as soon as new properties match'}
                              {freq === 'daily' && 'Get a daily digest of new matches'}
                              {freq === 'weekly' && 'Get a weekly digest of new matches'}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 px-4 py-2.5 text-warm-gray hover:text-navy border border-gray-200 rounded-xl font-medium text-sm transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2.5 bg-navy text-cream rounded-xl font-display font-bold text-sm hover:bg-navy-800 transition-colors"
                    >
                      {editingId ? 'Update Search' : 'Save Search'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirm && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-lg font-serif font-bold text-navy">Delete Search?</h3>
                </div>
                <p className="text-warm-gray text-sm mb-6">
                  This will remove your saved search and you won't receive any more alerts for it.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-4 py-2.5 text-warm-gray border border-gray-200 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" />
            </div>
          ) : searches.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gold/10 p-12 text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-navy/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-serif font-bold text-navy mb-2">No Saved Searches Yet</h3>
              <p className="text-warm-gray text-sm mb-6">
                Create your first saved search to get smart alerts when new properties match your criteria.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy text-cream font-medium rounded-xl hover:bg-navy-800 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Create First Search
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {searches.map((search) => (
                <div
                  key={search.id}
                  className={`bg-white rounded-2xl border transition-all ${
                    search.active ? 'border-gold/20 shadow-md' : 'border-gray-200 shadow-sm opacity-75'
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-navy">{search.name}</h3>
                          {search.active && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gold/10 border border-gold/30 rounded-full text-xs font-semibold text-gold">
                              <Eye className="w-3 h-3" />
                              Active
                            </span>
                          )}
                        </div>

                        {/* Filter Summary */}
                        <div className="flex flex-wrap gap-3 mb-3">
                          <div className="flex items-center gap-2 text-sm text-warm-gray">
                            <MapPin className="w-4 h-4 text-gold/60 flex-shrink-0" />
                            <span>{search.filters_json.city}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-warm-gray">
                            <Home className="w-4 h-4 text-gold/60 flex-shrink-0" />
                            <span className="capitalize">{search.filters_json.property_type}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-warm-gray">
                            <ChevronRight className="w-4 h-4 text-gold/60 flex-shrink-0" />
                            <span className="capitalize">{search.filters_json.deal_type}</span>
                          </div>
                        </div>

                        {/* Budget */}
                        {(search.filters_json.budget_min || search.filters_json.budget_max) && (
                          <div className="flex items-center gap-2 text-sm text-navy font-medium mb-3">
                            <DollarSign className="w-4 h-4 text-gold/60" />
                            <span>{formatBudget(search.filters_json.budget_min, search.filters_json.budget_max)}</span>
                          </div>
                        )}

                        {/* Alert Info */}
                        <div className="flex flex-wrap gap-3 text-xs text-warm-gray">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-navy/5 rounded-lg">
                            <Bell className="w-3 h-3 text-navy/60" />
                            <span className="capitalize">{search.alert_frequency}</span>
                          </span>
                          {search.last_alerted_at && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-lg">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span>Last: {formatDate(search.last_alerted_at)}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => toggleActive(search.id, search.active)}
                          className={`p-2.5 rounded-lg transition-colors ${
                            search.active
                              ? 'bg-gold/10 text-gold hover:bg-gold/20'
                              : 'bg-gray-100 text-warm-gray hover:bg-gray-200'
                          }`}
                          title={search.active ? 'Deactivate' : 'Activate'}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(search)}
                          className="p-2.5 text-warm-gray hover:text-navy hover:bg-navy/5 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(search.id)}
                          className="p-2.5 text-warm-gray hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
