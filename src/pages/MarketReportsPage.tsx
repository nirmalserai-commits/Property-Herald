import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  Download, Lock, TrendingUp, PieChart, Building2, DollarSign,
  Calendar, MapPin, ArrowRight, CheckCircle, Sparkles, ChevronDown,
} from 'lucide-react';

interface MarketReport {
  id: string;
  corridor: string;
  report_type: 'price_trends' | 'rental_yield' | 'inventory_analysis' | 'nri_investment' | 'quarterly_outlook';
  report_date: string;
  title: string;
  data_json: Record<string, unknown>;
  pdf_url: string | null;
  access_tier: 'free' | 'member' | 'premium';
  distributed_at: string | null;
  created_at: string;
}

const REPORT_TYPE_LABELS: Record<string, { label: string; icon: React.FC<{ className?: string }> }> = {
  price_trends: { label: 'Price Trends', icon: TrendingUp },
  rental_yield: { label: 'Rental Yield', icon: DollarSign },
  inventory_analysis: { label: 'Inventory Analysis', icon: Building2 },
  nri_investment: { label: 'NRI Investment', icon: PieChart },
  quarterly_outlook: { label: 'Quarterly Outlook', icon: ArrowRight },
};

const ACCESS_TIER_COLORS = {
  free: { bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-100 text-green-700', label: 'Free Access' },
  member: { bg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-gold/20 text-gold', label: 'Member' },
  premium: { bg: 'bg-navy-50', text: 'text-navy', badge: 'bg-navy text-cream', label: 'Premium' },
};

const DUMMY_REPORTS: MarketReport[] = [
  {
    id: 'dummy-1',
    corridor: 'Mumbai-Pune Corridor',
    report_type: 'price_trends',
    report_date: new Date().toISOString().split('T')[0],
    title: 'Price Trends Analysis',
    data_json: {},
    pdf_url: null,
    access_tier: 'free',
    distributed_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'dummy-2',
    corridor: 'Delhi NCR',
    report_type: 'rental_yield',
    report_date: new Date().toISOString().split('T')[0],
    title: 'Rental Yield Report Q3 2026',
    data_json: {},
    pdf_url: null,
    access_tier: 'member',
    distributed_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'dummy-3',
    corridor: 'Bengaluru',
    report_type: 'inventory_analysis',
    report_date: new Date().toISOString().split('T')[0],
    title: 'Inventory Analysis Report',
    data_json: {},
    pdf_url: null,
    access_tier: 'premium',
    distributed_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'dummy-4',
    corridor: 'Gurgaon',
    report_type: 'nri_investment',
    report_date: new Date().toISOString().split('T')[0],
    title: 'NRI Investment Opportunities',
    data_json: {},
    pdf_url: null,
    access_tier: 'member',
    distributed_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'dummy-5',
    corridor: 'Hyderabad',
    report_type: 'quarterly_outlook',
    report_date: new Date().toISOString().split('T')[0],
    title: 'Q3 2026 Market Outlook',
    data_json: {},
    pdf_url: null,
    access_tier: 'premium',
    distributed_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'dummy-6',
    corridor: 'Ahmedabad',
    report_type: 'price_trends',
    report_date: new Date().toISOString().split('T')[0],
    title: 'Price Movements & Trends',
    data_json: {},
    pdf_url: null,
    access_tier: 'free',
    distributed_at: null,
    created_at: new Date().toISOString(),
  },
];

export function MarketReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<MarketReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<MarketReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [corridors, setCorridors] = useState<string[]>([]);

  // Filter state
  const [selectedCorridor, setSelectedCorridor] = useState<string>('');
  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [selectedAccessTier, setSelectedAccessTier] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    async function fetchReports() {
      const { data, error } = await supabase
        .from('market_reports')
        .select('*')
        .order('report_date', { ascending: false });

      if (!error && data) {
        const typedReports = data as MarketReport[];
        setReports(typedReports);

        // Extract unique corridors
        const uniqueCorridors = Array.from(
          new Set(typedReports.map((r) => r.corridor))
        ).sort();
        setCorridors(uniqueCorridors);
      } else {
        // Use dummy reports if table is empty
        setReports(DUMMY_REPORTS);
        const uniqueCorridors = Array.from(
          new Set(DUMMY_REPORTS.map((r) => r.corridor))
        ).sort();
        setCorridors(uniqueCorridors);
      }
      setLoading(false);
    }
    fetchReports();
  }, []);

  useEffect(() => {
    let filtered = reports;

    if (selectedCorridor) {
      filtered = filtered.filter((r) => r.corridor === selectedCorridor);
    }

    if (selectedReportType) {
      filtered = filtered.filter((r) => r.report_type === selectedReportType);
    }

    if (selectedAccessTier) {
      filtered = filtered.filter((r) => r.access_tier === selectedAccessTier);
    }

    setFilteredReports(filtered);
  }, [reports, selectedCorridor, selectedReportType, selectedAccessTier]);

  const canAccessReport = (tier: string) => {
    if (tier === 'free') return true;
    if (tier === 'member' && user) return true;
    if (tier === 'premium' && user) return true;
    return false;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const isDummyReport = (id: string) => id.startsWith('dummy-');

  return (
    <Layout>
      <div className="min-h-screen bg-cream">
        {/* Hero Section */}
        <div className="bg-navy text-cream py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gold/15 text-gold text-sm font-medium mb-6 border border-gold/30">
              <TrendingUp className="w-4 h-4 mr-2" />
              Data-Driven Intelligence
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">
              Market Intelligence
            </h1>
            <p className="text-cream/70 text-lg max-w-2xl mx-auto">
              Comprehensive real estate market reports with actionable insights across India's
              prime corridors. Track price trends, rental yields, inventory levels, and investment
              opportunities with data updated quarterly.
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-cream border-b border-gold/20 sticky top-18 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
              {/* Mobile Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden flex items-center gap-2 px-4 py-2.5 rounded-lg bg-navy text-cream hover:bg-navy-800 transition-colors font-medium text-sm"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
                />
                Filters
              </button>

              {/* Filters - Desktop visible, Mobile toggleable */}
              <div
                className={`w-full md:w-auto grid grid-cols-1 md:grid-cols-3 gap-4 ${
                  showFilters ? 'block' : 'hidden md:grid'
                }`}
              >
                {/* Corridor Filter */}
                <div className="input-field">
                  <label className="block text-sm font-medium text-navy mb-2">Corridor</label>
                  <select
                    value={selectedCorridor}
                    onChange={(e) => setSelectedCorridor(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gold/30 bg-white text-navy focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                  >
                    <option value="">All Corridors</option>
                    {corridors.map((corridor) => (
                      <option key={corridor} value={corridor}>
                        {corridor}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Report Type Filter */}
                <div className="input-field">
                  <label className="block text-sm font-medium text-navy mb-2">Report Type</label>
                  <select
                    value={selectedReportType}
                    onChange={(e) => setSelectedReportType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gold/30 bg-white text-navy focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                  >
                    <option value="">All Types</option>
                    {Object.entries(REPORT_TYPE_LABELS).map(([key, { label }]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Access Tier Filter */}
                <div className="input-field">
                  <label className="block text-sm font-medium text-navy mb-2">Access Tier</label>
                  <select
                    value={selectedAccessTier}
                    onChange={(e) => setSelectedAccessTier(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gold/30 bg-white text-navy focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                  >
                    <option value="">All Tiers</option>
                    <option value="free">Free</option>
                    <option value="member">Member</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters Button */}
              {(selectedCorridor || selectedReportType || selectedAccessTier) && (
                <button
                  onClick={() => {
                    setSelectedCorridor('');
                    setSelectedReportType('');
                    setSelectedAccessTier('');
                  }}
                  className="md:ml-auto px-4 py-2.5 rounded-lg text-sm font-medium text-navy hover:bg-gold/10 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Reports Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
          ) : filteredReports.length > 0 ? (
            <>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-serif font-bold text-navy">
                  Available Reports
                </h2>
                <p className="text-sm text-warm-gray">
                  {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredReports.map((report) => {
                  const ReportIcon =
                    REPORT_TYPE_LABELS[report.report_type]?.icon || TrendingUp;
                  const tierColors = ACCESS_TIER_COLORS[report.access_tier as keyof typeof ACCESS_TIER_COLORS];
                  const canAccess = canAccessReport(report.access_tier);
                  const isPDF = report.pdf_url && !isDummyReport(report.id);

                  return (
                    <div
                      key={report.id}
                      className={`rounded-xl border transition-all hover:shadow-lg ${
                        isDummyReport(report.id)
                          ? 'bg-cream/50 border-dashed border-gold/30 opacity-60'
                          : 'bg-white border-gold/15 shadow-sm hover:border-gold/40'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="p-6 border-b border-gold/15">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1">
                            <h3 className={`font-serif font-semibold text-lg mb-1 ${
                              isDummyReport(report.id)
                                ? 'text-warm-gray/60'
                                : 'text-navy'
                            }`}>
                              {report.title}
                            </h3>
                            {isDummyReport(report.id) && (
                              <p className="text-xs font-medium text-gold uppercase tracking-wider">
                                Coming Soon
                              </p>
                            )}
                          </div>
                          <div className={`p-2 rounded-lg ${tierColors.bg}`}>
                            <ReportIcon className={`w-5 h-5 ${tierColors.text}`} />
                          </div>
                        </div>

                        {/* Report Type Badge */}
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="inline-block px-3 py-1 rounded-full bg-gold/10 text-navy text-xs font-medium">
                            {REPORT_TYPE_LABELS[report.report_type]?.label || report.report_type}
                          </span>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${tierColors.badge}`}>
                            {tierColors.label}
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-6 space-y-4">
                        {/* Corridor Badge */}
                        <div className="flex items-center gap-2 text-sm text-warm-gray">
                          <MapPin className="w-4 h-4 text-gold/60" />
                          {report.corridor}
                        </div>

                        {/* Report Date */}
                        <div className="flex items-center gap-2 text-sm text-warm-gray">
                          <Calendar className="w-4 h-4 text-gold/60" />
                          {formatDate(report.report_date)}
                        </div>

                        {/* Access Tier Lock & CTA */}
                        <div className="pt-4 border-t border-gold/15 flex items-center gap-3">
                          {canAccess ? (
                            <>
                              {isPDF ? (
                                <a
                                  href={report.pdf_url!}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gold text-navy font-medium hover:bg-gold-400 transition-colors text-sm"
                                >
                                  <Download className="w-4 h-4" />
                                  Download PDF
                                </a>
                              ) : (
                                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gold/10 text-gold font-medium hover:bg-gold/20 transition-colors text-sm cursor-not-allowed opacity-60">
                                  <CheckCircle className="w-4 h-4" />
                                  Coming Soon
                                </button>
                              )}
                            </>
                          ) : (
                            <div className="flex-1">
                              <Link
                                to="/magazine"
                                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-navy text-cream font-medium hover:bg-navy-800 transition-colors text-sm"
                              >
                                <Lock className="w-4 h-4" />
                                Upgrade Access
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <TrendingUp className="w-16 h-16 text-gold/30 mx-auto mb-4" />
              <h3 className="text-xl font-serif font-semibold text-navy mb-2">
                No Reports Found
              </h3>
              <p className="text-warm-gray mb-6">
                Try adjusting your filters or check back soon for new market intelligence reports
              </p>
              <button
                onClick={() => {
                  setSelectedCorridor('');
                  setSelectedReportType('');
                  setSelectedAccessTier('');
                }}
                className="px-6 py-3 rounded-lg bg-navy text-cream font-medium hover:bg-navy-800 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>

        {/* Premium CTA Section */}
        <div className="bg-navy text-cream py-16 border-t border-gold/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-gold/15 text-gold text-sm font-medium mb-6 border border-gold/30">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Exclusive Access
                </div>
                <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
                  Get Early Access to Premium Reports
                </h2>
                <p className="text-cream/70 text-lg mb-6">
                  Join Property Herald's premium subscription to unlock comprehensive market
                  analysis, NRI investment guides, and quarterly outlooks delivered directly to
                  your inbox. Stay ahead of market trends with data-driven insights.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    'Quarterly market reports for all major corridors',
                    'NRI investment opportunity analysis',
                    'Rental yield & price trend forecasts',
                    'Early access to new market intelligence',
                    'Download full PDF reports',
                  ].map((benefit) => (
                    <li key={benefit} className="flex items-center gap-3 text-cream/80">
                      <CheckCircle className="w-5 h-5 text-gold flex-shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/magazine"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gold text-navy font-display font-bold uppercase tracking-wider hover:bg-gold-400 transition-colors shadow-lg hover:shadow-xl"
                >
                  <Sparkles className="w-5 h-5" />
                  Subscribe Now
                </Link>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { number: '15+', label: 'Corridors Covered' },
                  { number: '5', label: 'Report Types' },
                  { number: '1000+', label: 'Data Points' },
                  { number: 'Q3 2026', label: 'Latest Update' },
                ].map(({ number, label }) => (
                  <div
                    key={label}
                    className="bg-gold/10 border border-gold/20 rounded-xl p-6 text-center"
                  >
                    <p className="text-3xl font-serif font-bold text-gold mb-2">{number}</p>
                    <p className="text-sm text-cream/70">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
