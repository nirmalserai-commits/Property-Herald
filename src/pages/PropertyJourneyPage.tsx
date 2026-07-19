import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  ChevronRight,
  MapPin,
  Calendar,
  FileText,
  Plus,
  Loader,
  AlertCircle,
  Home,
  CheckCircle,
} from 'lucide-react';

interface Journey {
  id: string;
  listing_id: string;
  buyer_id: string;
  stage: string;
  stage_updated_at: string;
  notes: string | null;
  created_at: string;
  listings?: {
    title: string;
    city: { name: string } | string;
    property_type: string;
  };
}

const STAGES = [
  'discovered',
  'interested',
  'site_visit',
  'negotiation',
  'agreement',
  'financing',
  'registration',
  'possession',
] as const;

const STAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  discovered: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  interested: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  site_visit: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  negotiation: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  agreement: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  financing: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  registration: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  possession: { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-400' },
};

export default function PropertyJourneyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingStage, setEditingStage] = useState<Record<string, string>>({});
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [newListingId, setNewListingId] = useState('');
  const [addingJourney, setAddingJourney] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchJourneys();
  }, [user, navigate]);

  const fetchJourneys = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('property_journey')
        .select('*, listings(title, city:cities(name), property_type)')
        .eq('buyer_id', user?.id)
        .order('stage_updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      setJourneys(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load journeys');
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (journeyId: string, newStage: string) => {
    try {
      const { error: updateError } = await supabase
        .from('property_journey')
        .update({
          stage: newStage,
          stage_updated_at: new Date().toISOString(),
        })
        .eq('id', journeyId);

      if (updateError) throw updateError;

      setJourneys((prev) =>
        prev.map((j) =>
          j.id === journeyId
            ? {
                ...j,
                stage: newStage,
                stage_updated_at: new Date().toISOString(),
              }
            : j
        )
      );

      setEditingStage((prev) => {
        const updated = { ...prev };
        delete updated[journeyId];
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stage');
    }
  };

  const handleNotesChange = async (journeyId: string, newNotes: string) => {
    try {
      const { error: updateError } = await supabase
        .from('property_journey')
        .update({ notes: newNotes || null })
        .eq('id', journeyId);

      if (updateError) throw updateError;

      setJourneys((prev) =>
        prev.map((j) =>
          j.id === journeyId
            ? {
                ...j,
                notes: newNotes || null,
              }
            : j
        )
      );

      setEditingNotes((prev) => {
        const updated = { ...prev };
        delete updated[journeyId];
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notes');
    }
  };

  const handleAddJourney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListingId.trim()) return;

    try {
      setAddingJourney(true);
      setAddError(null);

      const { error: insertError } = await supabase.from('property_journey').insert([
        {
          listing_id: newListingId,
          buyer_id: user?.id,
          stage: 'discovered',
          stage_updated_at: new Date().toISOString(),
          notes: null,
        },
      ]);

      if (insertError) throw insertError;

      setNewListingId('');
      await fetchJourneys();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add journey');
    } finally {
      setAddingJourney(false);
    }
  };

  const getStageIndex = (stage: string) => STAGES.indexOf(stage as typeof STAGES[number]);

  const getCityName = (city: Journey['listings']['city']) => {
    if (typeof city === 'string') return city;
    return city?.name || 'Unknown';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="min-h-screen" style={{ backgroundColor: '#fdf8f0' }}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Home style={{ color: '#0a1628' }} size={32} />
              <h1 className="text-4xl font-bold" style={{ color: '#0a1628' }}>
                Property Journey
              </h1>
            </div>
            <p style={{ color: '#0a1628' }} className="opacity-75">
              Track your progress through the property purchase journey
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-100 border border-red-300 flex gap-3">
              <AlertCircle size={20} style={{ color: '#991b1b' }} />
              <p style={{ color: '#991b1b' }}>{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader className="animate-spin" style={{ color: '#c9a84c' }} size={32} />
            </div>
          ) : journeys.length === 0 ? (
            <div className="text-center py-12 px-6">
              <Home
                size={48}
                style={{ color: '#c9a84c' }}
                className="mx-auto mb-4 opacity-50"
              />
              <h2 className="text-2xl font-semibold mb-2" style={{ color: '#0a1628' }}>
                No properties tracked yet
              </h2>
              <p style={{ color: '#0a1628' }} className="opacity-75 mb-8">
                Start by adding a property to track your journey
              </p>
            </div>
          ) : (
            <div className="space-y-4 mb-8">
              {journeys.map((journey) => {
                const stageIndex = getStageIndex(journey.stage);
                const cityName = journey.listings ? getCityName(journey.listings.city) : 'Unknown';
                const listingTitle = journey.listings?.title || journey.listing_id;
                const isExpanded = expandedId === journey.id;

                return (
                  <div
                    key={journey.id}
                    className="bg-white rounded-lg border-2"
                    style={{ borderColor: '#c9a84c' }}
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : journey.id)}
                      className="w-full text-left p-6 flex items-center justify-between hover:opacity-90 transition"
                    >
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2" style={{ color: '#0a1628' }}>
                          {listingTitle}
                        </h3>

                        <div className="flex flex-wrap gap-4 items-center mb-3">
                          <div className="flex items-center gap-2">
                            <MapPin size={16} style={{ color: '#c9a84c' }} />
                            <span style={{ color: '#0a1628' }}>{cityName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar size={16} style={{ color: '#c9a84c' }} />
                            <span style={{ color: '#0a1628' }} className="text-sm">
                              {formatDate(journey.stage_updated_at)}
                            </span>
                          </div>
                        </div>

                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${((stageIndex + 1) / STAGES.length) * 100}%`,
                              backgroundColor: '#c9a84c',
                            }}
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              STAGE_COLORS[journey.stage]?.bg || 'bg-gray-100'
                            } ${STAGE_COLORS[journey.stage]?.text || 'text-gray-700'}`}
                          >
                            {journey.stage.replace(/_/g, ' ')}
                          </span>
                          {journey.notes && (
                            <span style={{ color: '#0a1628' }} className="text-sm opacity-60">
                              {journey.notes.substring(0, 40)}
                              {journey.notes.length > 40 ? '...' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight
                        size={24}
                        style={{ color: '#c9a84c' }}
                        className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="border-t-2 p-6" style={{ borderColor: '#c9a84c' }}>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div>
                            <label className="block text-sm font-semibold mb-2" style={{ color: '#0a1628' }}>
                              Update Stage
                            </label>
                            <select
                              value={editingStage[journey.id] || journey.stage}
                              onChange={(e) => {
                                const newStage = e.target.value;
                                setEditingStage((prev) => ({ ...prev, [journey.id]: newStage }));
                                handleStageChange(journey.id, newStage);
                              }}
                              className="input-field w-full"
                            >
                              {STAGES.map((stage) => (
                                <option key={stage} value={stage}>
                                  {stage.replace(/_/g, ' ')}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold mb-2" style={{ color: '#0a1628' }}>
                              Property Type
                            </label>
                            <input
                              type="text"
                              disabled
                              value={journey.listings?.property_type || 'Unknown'}
                              className="input-field w-full opacity-50"
                            />
                          </div>
                        </div>

                        <div className="mb-6">
                          <label className="block text-sm font-semibold mb-2" style={{ color: '#0a1628' }}>
                            Notes
                          </label>
                          <textarea
                            value={editingNotes[journey.id] !== undefined ? editingNotes[journey.id] : journey.notes || ''}
                            onChange={(e) => {
                              setEditingNotes((prev) => ({
                                ...prev,
                                [journey.id]: e.target.value,
                              }));
                            }}
                            onBlur={(e) => {
                              const newNotes = e.target.value;
                              handleNotesChange(journey.id, newNotes);
                            }}
                            className="input-field w-full min-h-24 resize-none"
                            placeholder="Add your notes about this property..."
                          />
                        </div>

                        <div className="flex gap-2 text-xs opacity-60">
                          <span>Created: {formatDate(journey.created_at)}</span>
                          <span>•</span>
                          <span>Stage updated: {formatDate(journey.stage_updated_at)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="bg-white rounded-lg border-2 p-6" style={{ borderColor: '#0a1628' }}>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: '#0a1628' }}>
              <Plus size={20} />
              Add New Property
            </h2>

            {addError && (
              <div className="mb-4 p-3 rounded-lg bg-red-100 border border-red-300 flex gap-2">
                <AlertCircle size={16} style={{ color: '#991b1b' }} />
                <p style={{ color: '#991b1b' }} className="text-sm">
                  {addError}
                </p>
              </div>
            )}

            <form onSubmit={handleAddJourney} className="flex gap-3">
              <input
                type="text"
                placeholder="Enter listing ID (UUID)"
                value={newListingId}
                onChange={(e) => setNewListingId(e.target.value)}
                className="input-field flex-1"
                disabled={addingJourney}
              />
              <button
                type="submit"
                disabled={addingJourney || !newListingId.trim()}
                className="px-6 py-2 rounded-lg font-semibold text-white transition disabled:opacity-50"
                style={{ backgroundColor: '#c9a84c' }}
              >
                {addingJourney ? (
                  <Loader size={20} className="animate-spin" />
                ) : (
                  <CheckCircle size={20} />
                )}
              </button>
            </form>

            <p style={{ color: '#0a1628' }} className="text-sm opacity-60 mt-2">
              Copy the listing ID from the property you want to track
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
