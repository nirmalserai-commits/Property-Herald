import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Magazine } from '../types/database';
import { BookOpen, ZoomIn, Download, MessageCircle, Clock, FileText, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

export function MagazinePage() {
  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [selectedMagazine, setSelectedMagazine] = useState<Magazine | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMagazines() {
      const { data } = await supabase.from('magazines').select('*').eq('is_published', true).order('issue_number', { ascending: false }).limit(6);
      if (data) {
        setMagazines(data as Magazine[]);
        if (data.length > 0) setSelectedMagazine(data[0] as Magazine);
      }
      setLoading(false);
    }
    fetchMagazines();
  }, []);

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-navy text-cream py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-gold/15 text-gold text-sm font-medium mb-4 border border-gold/30">
            <Clock className="w-4 h-4 mr-2" />Weekly Publication
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4">Property Herald Magazine</h1>
          <p className="text-cream/70 text-lg max-w-2xl mx-auto">Our digital flipbook magazine reaches over 1,00,000 property buyers through WhatsApp groups</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : magazines.length > 0 ? (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gold/15">
                {selectedMagazine && (
                  <div>
                    <div className="bg-navy text-cream px-6 py-4 flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-serif font-semibold">Issue #{selectedMagazine.issue_number}</h2>
                        <p className="text-cream/60 text-sm">{selectedMagazine.title}</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-white/10 rounded-lg transition-colors"><ZoomIn className="w-5 h-5" /></button>
                        <button className="p-2 hover:bg-white/10 rounded-lg transition-colors"><Download className="w-5 h-5" /></button>
                      </div>
                    </div>
                    <div className="relative bg-cream aspect-[4/3] flex items-center justify-center">
                      {selectedMagazine.flipbook_url ? (
                        <iframe src={selectedMagazine.flipbook_url} className="absolute inset-0 w-full h-full" title={`Issue #${selectedMagazine.issue_number}`} />
                      ) : (
                        <div className="text-center p-8">
                          <BookOpen className="w-24 h-24 text-gold/40 mx-auto mb-6" />
                          <h3 className="text-2xl font-serif font-bold text-navy mb-2">Issue #{selectedMagazine.issue_number}</h3>
                          <p className="text-warm-gray mb-4">{selectedMagazine.title}</p>
                          <p className="text-warm-gray/60 text-sm">Flipbook content will be displayed here</p>
                        </div>
                      )}
                    </div>
                    {selectedMagazine.description && (
                      <div className="p-6 bg-cream/50 border-t border-gold/15">
                        <p className="text-warm-gray">{selectedMagazine.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-serif font-semibold text-navy mb-4">Past Issues</h3>
              <div className="space-y-3">
                {magazines.map((magazine) => (
                  <button key={magazine.id} onClick={() => setSelectedMagazine(magazine)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all text-left ${
                      selectedMagazine?.id === magazine.id
                        ? 'bg-navy text-cream shadow-lg border border-gold/20'
                        : 'bg-white hover:bg-gold/5 shadow-sm border border-gold/15 hover:border-gold/40'
                    }`}>
                    <div className={`w-12 h-16 rounded flex items-center justify-center ${selectedMagazine?.id === magazine.id ? 'bg-white/15' : 'bg-gold/10 border border-gold/20'}`}>
                      <FileText className={`w-6 h-6 ${selectedMagazine?.id === magazine.id ? 'text-gold' : 'text-gold/60'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-serif font-semibold ${selectedMagazine?.id === magazine.id ? 'text-cream' : 'text-navy'}`}>
                        Issue #{magazine.issue_number}
                      </p>
                      <p className={`text-sm truncate ${selectedMagazine?.id === magazine.id ? 'text-cream/60' : 'text-warm-gray'}`}>
                        {magazine.title}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-gold/15">
            <BookOpen className="w-16 h-16 text-gold/30 mx-auto mb-4" />
            <h3 className="text-xl font-serif font-semibold text-navy mb-2">Coming Soon</h3>
            <p className="text-warm-gray mb-6">Our first magazine issue will be published soon</p>
            <Link to="/register" className="btn-gold">Subscribe for Updates</Link>
          </div>
        )}

        {/* Advertising Info */}
        <div className="mt-12 bg-navy rounded-xl p-8 text-cream border border-gold/20">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-serif font-bold mb-4">Advertise in Our Magazine</h2>
              <p className="text-cream/70 mb-6">Reach 1,00,000+ potential customers through our WhatsApp magazine distribution. Every advertisement includes an embedded WhatsApp link for instant inquiries.</p>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { size: 'Full', unit: 'Page' },
                  { size: 'Half', unit: 'Page' },
                  { size: '1/4', unit: 'Page' },
                ].map(({ size, unit }) => (
                  <div key={size} className="bg-gold/10 border border-gold/20 rounded-lg p-4 text-center">
                    <p className="text-2xl font-serif font-bold text-gold">{size}</p>
                    <p className="text-sm text-cream/60">{unit}</p>
                  </div>
                ))}
              </div>
              <Link to="/register" className="btn-gold">
                <MessageCircle className="w-5 h-5 mr-2" />Enquire About Advertising
              </Link>
            </div>
            <div className="bg-gold/10 border border-gold/20 rounded-xl p-6">
              <h3 className="font-serif font-semibold text-lg text-cream mb-4">Advertising Benefits</h3>
              <ul className="space-y-3">
                {[
                  'Direct WhatsApp lead generation',
                  '1,00,000+ WhatsApp group members',
                  'Weekly publication',
                  '6 issues archived on website',
                  'Searchable past issues',
                  'Premium audience of property seekers',
                ].map((benefit) => (
                  <li key={benefit} className="flex items-center text-cream/80">
                    <Check className="w-5 h-5 mr-3 text-gold flex-shrink-0" />{benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
