import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import {
  Calendar,
  Clock,
  Users,
  Award,
  ArrowRight,
  Play,
  Radio,
  AlertCircle,
  Check,
  Zap,
  Lock,
  Video,
} from 'lucide-react';

interface LiveEvent {
  id: string;
  title: string;
  event_date: string;
  duration_minutes: number;
  developer_slots_json: Array<{ developer_name: string; listing_id: string; slot_purchased_at: string }>;
  buyer_registrations_json: string[];
  recording_url: string | null;
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  tokens_per_slot: number;
  max_developer_slots: number;
  created_at: string;
}

export function LiveEventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allEvents, setAllEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      const { data, error } = await supabase
        .from('live_events')
        .select('*')
        .order('event_date', { ascending: false });

      if (error) throw error;
      setAllEvents((data || []) as LiveEvent[]);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleBuyerRegistration(eventId: string) {
    if (!user) {
      navigate('/login');
      return;
    }

    setRegistering(eventId);
    setRegistrationError(null);
    setRegistrationSuccess(null);

    try {
      const event = allEvents.find(e => e.id === eventId);
      if (!event) throw new Error('Event not found');

      // Check if already registered
      const existingReg = event.buyer_registrations_json.includes(user.id);
      if (existingReg) {
        setRegistrationError('You are already registered for this event');
        setRegistering(null);
        return;
      }

      // Add user to buyer_registrations_json
      const updatedRegistrations = [...event.buyer_registrations_json, user.id];
      const { error } = await supabase
        .from('live_events')
        .update({ buyer_registrations_json: updatedRegistrations })
        .eq('id', eventId);

      if (error) throw error;

      setRegistrationSuccess(`Successfully registered for "${event.title}"!`);
      await fetchEvents();
      setTimeout(() => setRegistrationSuccess(null), 5000);
    } catch (err) {
      setRegistrationError(err instanceof Error ? err.message : 'Failed to register');
    } finally {
      setRegistering(null);
    }
  }

  const upcomingAndLive = allEvents.filter(e => ['upcoming', 'live'].includes(e.status));
  const completed = allEvents.filter(e => e.status === 'completed');

  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isUserRegistered = (event: LiveEvent) => user && event.buyer_registrations_json.includes(user.id);

  return (
    <Layout>
      <div className="bg-cream min-h-screen">
        {/* ═══ HERO ═══ */}
        <section className="relative min-h-[500px] flex flex-col items-center justify-center bg-navy overflow-hidden">
          <div className="absolute inset-0 geo-pattern opacity-20" />
          <div className="relative z-10 flex flex-col items-center text-center px-4 w-full max-w-4xl mx-auto py-24">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gold/10 border border-gold/30 text-gold text-sm font-display font-semibold uppercase tracking-wider mb-6">
              <Radio className="w-4 h-4 mr-2" />
              Premium Virtual Events
            </div>

            <h1 className="text-4xl md:text-6xl font-serif font-bold text-cream mb-4 text-balance">
              Property Herald<br />
              <span className="text-gold">LIVE</span>
            </h1>

            <p className="text-cream/70 text-lg md:text-xl max-w-2xl leading-relaxed mb-8 font-sans">
              Monthly virtual property showcases where India's top developers present breakthrough projects directly to verified buyers. Connect, discover, invest.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-display font-semibold">
              <div className="flex items-center text-gold">
                <Award className="w-4 h-4 mr-2" />
                Verified Developers
              </div>
              <div className="flex items-center text-gold">
                <Users className="w-4 h-4 mr-2" />
                Curated Buyers
              </div>
              <div className="flex items-center text-gold">
                <Zap className="w-4 h-4 mr-2" />
                Exclusive Access
              </div>
            </div>
          </div>
        </section>

        {/* ═══ REGISTRATION SUCCESS/ERROR ═══ */}
        {(registrationSuccess || registrationError) && (
          <div className={`sticky top-0 z-50 px-4 py-4 text-center font-semibold ${
            registrationSuccess ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
              {registrationSuccess ? (
                <>
                  <Check className="w-5 h-5 flex-shrink-0" />
                  {registrationSuccess}
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {registrationError}
                </>
              )}
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          {/* ═══ UPCOMING & LIVE EVENTS ═══ */}
          <section className="mb-24">
            <div className="mb-12">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-navy/8 border border-gold/30 text-navy text-sm font-display font-semibold uppercase tracking-wider mb-4">
                <Calendar className="w-4 h-4 mr-2 text-gold" />
                Upcoming & Live
              </div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-navy mb-2">
                Upcoming Events
              </h2>
              <div className="w-12 h-0.5 bg-gold mb-4" />
              <p className="text-warm-gray max-w-xl">
                Register to attend exclusive developer presentations and connect with India's leading real estate innovators
              </p>
            </div>

            {loading ? (
              <div className="grid md:grid-cols-2 gap-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gold/15 p-8 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
                    <div className="h-4 bg-gray-100 rounded w-1/2 mb-6" />
                    <div className="space-y-3">
                      <div className="h-3 bg-gray-100 rounded" />
                      <div className="h-3 bg-gray-100 rounded w-5/6" />
                    </div>
                  </div>
                ))}
              </div>
            ) : upcomingAndLive.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-8">
                {upcomingAndLive.map((event) => {
                  const developerSlotsUsed = (event.developer_slots_json || []).length;
                  const maxSlots = event.max_developer_slots || 8;
                  const buyerCount = (event.buyer_registrations_json || []).length;
                  const isLive = event.status === 'live';
                  const userRegistered = isUserRegistered(event);

                  return (
                    <div
                      key={event.id}
                      className={`relative overflow-hidden rounded-2xl border transition-all ${
                        isLive
                          ? 'border-gold/50 bg-gradient-to-br from-navy-50 to-navy-100 shadow-lg shadow-gold/20'
                          : 'border-gold/20 bg-white hover:border-gold/40 hover:shadow-lg'
                      }`}
                    >
                      {/* Live Badge */}
                      {isLive && (
                        <div className="absolute top-6 right-6 z-20">
                          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500 text-white font-display font-bold text-sm uppercase tracking-wider">
                            <Radio className="w-4 h-4 animate-pulse" />
                            LIVE NOW
                          </div>
                        </div>
                      )}

                      <div className="p-8">
                        {/* Title & Date */}
                        <div className="mb-6">
                          <h3 className={`text-2xl font-serif font-bold mb-3 ${
                            isLive ? 'text-navy' : 'text-navy'
                          }`}>
                            {event.title}
                          </h3>
                          <div className="flex flex-col gap-2 text-sm text-warm-gray">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gold flex-shrink-0" />
                              {formatEventDate(event.event_date)}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gold flex-shrink-0" />
                              {event.duration_minutes} minutes
                            </div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-navy/5 rounded-xl border border-navy/10">
                          <div>
                            <div className="text-xs font-display font-semibold text-warm-gray uppercase tracking-wider mb-1">
                              Developer Slots
                            </div>
                            <div className="text-2xl font-bold text-navy">
                              {developerSlotsUsed}<span className="text-xs text-warm-gray">/{maxSlots}</span>
                            </div>
                            <div className="w-full bg-navy/10 rounded-full h-1.5 mt-2">
                              <div
                                className="bg-gold rounded-full h-1.5 transition-all"
                                style={{ width: `${(developerSlotsUsed / maxSlots) * 100}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-display font-semibold text-warm-gray uppercase tracking-wider mb-1">
                              Registered Buyers
                            </div>
                            <div className="text-2xl font-bold text-navy">{buyerCount}</div>
                            <div className="text-xs text-warm-gray mt-2">Verified professionals</div>
                          </div>
                        </div>

                        {/* Slot Cost Info */}
                        <div className="mb-6 p-3 bg-gold/5 border border-gold/20 rounded-lg flex items-start gap-3">
                          <Zap className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs font-display font-semibold text-navy uppercase tracking-wider">
                              Developer Slot Cost
                            </div>
                            <div className="text-sm text-warm-gray">
                              {event.tokens_per_slot} tokens per 10-minute showcase slot
                            </div>
                          </div>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-col gap-3">
                          {userRegistered ? (
                            <button className="w-full py-3 px-4 rounded-lg bg-gold/20 text-navy font-semibold text-sm border border-gold/30 flex items-center justify-center gap-2 cursor-default">
                              <Check className="w-4 h-4" />
                              You're Registered
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBuyerRegistration(event.id)}
                              disabled={registering === event.id}
                              className="w-full py-3 px-4 rounded-lg bg-navy hover:bg-navy-800 text-cream font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              <Users className="w-4 h-4" />
                              {registering === event.id ? 'Registering...' : 'Register as Buyer'}
                            </button>
                          )}

                          <Link
                            to="/tokens"
                            className="w-full py-3 px-4 rounded-lg bg-cream border border-navy/20 text-navy font-semibold text-sm hover:bg-cream/80 transition-colors flex items-center justify-center gap-2"
                          >
                            <Zap className="w-4 h-4 text-gold" />
                            Book Developer Slot
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gold/15 p-16 text-center">
                <Calendar className="w-16 h-16 text-gold/30 mx-auto mb-4" />
                <h3 className="text-xl font-serif font-bold text-navy mb-2">No Upcoming Events</h3>
                <p className="text-warm-gray mb-6 max-w-md mx-auto">
                  Our next Property Herald LIVE showcase is coming soon. Check back monthly for exclusive virtual events.
                </p>
                <Link to="/register" className="inline-block px-6 py-3 bg-gold text-navy font-semibold rounded-lg hover:bg-gold/90 transition-colors">
                  Get Notified
                </Link>
              </div>
            )}
          </section>

          {/* ═══ HOW IT WORKS ═══ */}
          <section className="mb-24 py-16 px-8 bg-navy rounded-2xl border border-gold/20">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-16">
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-gold/10 border border-gold/30 text-gold text-sm font-display font-semibold uppercase tracking-wider mb-6">
                  <Award className="w-4 h-4 mr-2" />
                  How Property Herald LIVE Works
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    icon: Zap,
                    title: 'Developers Book Slots',
                    desc: 'Top verified developers purchase 10-minute showcase slots using Property Herald tokens. Each month features 8 curated presentations.',
                  },
                  {
                    icon: Users,
                    title: 'Buyers Register Free',
                    desc: 'Verified property buyers attend at no cost. Network with developers, ask questions live, and explore investment opportunities in real-time.',
                  },
                  {
                    icon: Video,
                    title: 'Access Recordings',
                    desc: 'Can\'t attend live? Watch the complete recording afterward. Available for 30 days post-event for registered members.',
                  },
                ].map(({ icon: Icon, title, desc }, i) => (
                  <div key={i} className="relative">
                    <div className="flex flex-col h-full">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold/20 border border-gold/40 mb-6">
                        <Icon className="w-6 h-6 text-gold" />
                      </div>
                      <h3 className="text-lg font-serif font-bold text-cream mb-3">{title}</h3>
                      <p className="text-cream/70 text-sm leading-relaxed flex-grow">{desc}</p>

                      {i < 2 && (
                        <div className="hidden md:flex absolute top-12 right-0 translate-x-1/2 items-center">
                          <div className="w-8 h-0.5 bg-gold/40" />
                          <ArrowRight className="w-4 h-4 text-gold ml-2" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 p-6 bg-gold/10 border border-gold/25 rounded-xl text-center">
                <div className="text-sm font-display font-semibold text-gold uppercase tracking-wider mb-2">
                  Monthly Schedule
                </div>
                <p className="text-cream text-lg font-serif mb-4">
                  New events hosted every first Saturday at 2:00 PM IST
                </p>
                <p className="text-cream/60 text-sm">
                  Slots fill quickly. Register early to secure your developer showcase or buyer seat.
                </p>
              </div>
            </div>
          </section>

          {/* ═══ COMPLETED EVENTS & RECORDINGS ═══ */}
          <section>
            <div className="mb-12">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-navy/8 border border-gold/30 text-navy text-sm font-display font-semibold uppercase tracking-wider mb-4">
                <Video className="w-4 h-4 mr-2 text-gold" />
                Past Events
              </div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-navy mb-2">
                Event Recordings
              </h2>
              <div className="w-12 h-0.5 bg-gold mb-4" />
              <p className="text-warm-gray max-w-xl">
                Catch up on previous showcases and explore projects you may have missed
              </p>
            </div>

            {completed.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {completed.map((event) => (
                  <div key={event.id} className="group relative overflow-hidden rounded-2xl border border-gold/20 bg-white hover:border-gold/40 hover:shadow-lg transition-all">
                    {/* Placeholder for recording thumbnail */}
                    <div className="relative aspect-video bg-gradient-to-br from-navy-200 to-navy-400 flex items-center justify-center overflow-hidden">
                      <Video className="w-16 h-16 text-white/40 group-hover:scale-110 transition-transform" />
                      {event.recording_url && (
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                          <Play className="w-12 h-12 text-white group-hover:scale-110 transition-transform" />
                        </div>
                      )}
                    </div>

                    <div className="p-6">
                      <h3 className="text-lg font-serif font-bold text-navy mb-3 line-clamp-2">
                        {event.title}
                      </h3>

                      <div className="space-y-2 mb-6 text-sm text-warm-gray">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gold flex-shrink-0" />
                          {formatEventDate(event.event_date)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gold flex-shrink-0" />
                          {(event.developer_slots_json || []).length} developers presented
                        </div>
                      </div>

                      {event.recording_url ? (
                        <a
                          href={event.recording_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-navy hover:bg-navy-800 text-cream font-semibold text-sm rounded-lg transition-colors w-full justify-center"
                        >
                          <Play className="w-4 h-4" />
                          Watch Recording
                        </a>
                      ) : (
                        <button
                          disabled
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-cream border border-navy/20 text-navy font-semibold text-sm rounded-lg w-full justify-center opacity-50 cursor-not-allowed"
                        >
                          <Lock className="w-4 h-4" />
                          Recording Coming Soon
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gold/15 p-16 text-center">
                <Video className="w-16 h-16 text-gold/30 mx-auto mb-4" />
                <h3 className="text-xl font-serif font-bold text-navy mb-2">No Recordings Yet</h3>
                <p className="text-warm-gray">
                  Past event recordings will appear here once they're processed and published.
                </p>
              </div>
            )}
          </section>

          {/* ═══ CTA SECTION ═══ */}
          <section className="mt-24 py-16 px-8 bg-gradient-to-r from-navy via-navy-800 to-navy rounded-2xl border border-gold/30 text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-cream mb-4">
              Ready to Showcase Your Project?
            </h2>
            <p className="text-cream/70 max-w-2xl mx-auto mb-8 text-lg">
              Book your 10-minute developer slot and present to verified property buyers nationwide. Limited slots available each month.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/tokens"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gold text-navy font-bold rounded-lg hover:bg-gold/90 transition-colors"
              >
                <Zap className="w-5 h-5" />
                Book Your Slot
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-cream/20 border-2 border-cream text-cream font-bold rounded-lg hover:bg-cream/30 transition-colors"
              >
                <Award className="w-5 h-5" />
                Join as Developer
              </Link>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
