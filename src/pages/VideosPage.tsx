import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Video } from '../types/database';
import { Video as VideoIcon, X, ArrowLeft, Play, Film } from 'lucide-react';

export function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState<Video | null>(null);

  useEffect(() => {
    supabase
      .from('videos')
      .select('*')
      .eq('active', true)
      .order('display_order')
      .then(({ data, error: err }) => {
        if (err) {
          setError('Unable to load videos right now. Please check back later.');
        } else if (data) {
          setVideos(data as Video[]);
        }
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <section className="bg-navy text-cream py-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-gold/10 border border-gold/30 text-gold text-sm font-display font-semibold uppercase tracking-wider mb-4">
            <Film className="w-4 h-4 mr-2" />Our Videos
          </div>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-gold mb-2">Property Herald Videos</h1>
          <p className="text-cream/60">Project walkthroughs, market updates, and testimonials</p>
        </div>
      </section>

      {/* Back link */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-navy transition-colors">
          <ArrowLeft className="w-4 h-4" />Back to Home
        </Link>
      </div>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 animate-pulse">
                <div className="aspect-video bg-gray-100 rounded-t-2xl" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-gray-500">{error}</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <div className="w-16 h-16 bg-gold/10 border border-gold/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <VideoIcon className="w-8 h-8 text-gold" />
            </div>
            <h3 className="text-lg font-serif font-bold text-navy mb-1">Videos coming soon</h3>
            <p className="text-gray-500 text-sm">We're adding new videos. Please check back shortly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map(v => (
              <button
                key={v.id}
                onClick={() => setPlaying(v)}
                className="group text-left bg-white rounded-2xl border border-gray-200 hover:border-gold/50 hover:shadow-xl transition-all overflow-hidden"
              >
                <div className="aspect-video bg-gray-100 overflow-hidden relative">
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <VideoIcon className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-14 h-14 rounded-full bg-gold/90 flex items-center justify-center">
                      <Play className="w-6 h-6 text-navy ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                  {v.category && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 bg-navy/80 text-gold text-xs font-medium rounded-full backdrop-blur-sm">
                      {v.category}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-serif font-bold text-navy text-base leading-tight">{v.title}</h3>
                  {v.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{v.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Video player modal */}
      {playing && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPlaying(null)}
        >
          <div className="w-full max-w-4xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-serif font-bold text-cream truncate">{playing.title}</h3>
              <button onClick={() => setPlaying(null)} className="p-2 text-cream/60 hover:text-cream rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="bg-black rounded-2xl overflow-hidden shadow-2xl">
              <video
                src={playing.video_url}
                controls
                autoPlay
                playsInline
                className="w-full max-h-[80vh]"
              />
            </div>
            {playing.description && (
              <p className="text-cream/60 text-sm mt-3">{playing.description}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
