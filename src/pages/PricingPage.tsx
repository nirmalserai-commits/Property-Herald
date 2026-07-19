import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Check, Zap, Star, Crown, Rocket, Building2, ChevronRight } from 'lucide-react';

interface Bundle {
  id: string;
  name: string;
  tokens: number;
  price: number;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  popular?: boolean;
  perks: string[];
}

const BUNDLES: Bundle[] = [
  {
    id: 'starter',
    name: 'Starter',
    tokens: 100,
    price: 2000,
    icon: <Zap className="w-6 h-6" />,
    color: 'bg-slate-50',
    borderColor: 'border-slate-200',
    perks: [
      '50 WhatsApp leads',
      '2 Featured listings',
      'Perfect to get started',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    tokens: 275,
    price: 5000,
    icon: <Star className="w-6 h-6" />,
    color: 'bg-blue-50',
    borderColor: 'border-blue-200',
    perks: [
      '137 WhatsApp leads',
      '5 Featured listings',
      '10% bonus tokens',
    ],
  },
  {
    id: 'power',
    name: 'Power',
    tokens: 600,
    price: 10000,
    icon: <Rocket className="w-6 h-6" />,
    color: 'bg-amber-50',
    borderColor: 'border-amber-200',
    popular: true,
    perks: [
      '300 WhatsApp leads',
      '12 Featured listings',
      '20% bonus tokens',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    tokens: 1300,
    price: 20000,
    icon: <Crown className="w-6 h-6" />,
    color: 'bg-gold/5',
    borderColor: 'border-gold/30',
    perks: [
      '650 WhatsApp leads',
      '26 Featured listings',
      '30% bonus tokens',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tokens: 3250,
    price: 50000,
    icon: <Building2 className="w-6 h-6" />,
    color: 'bg-navy/5',
    borderColor: 'border-navy/20',
    perks: [
      'Unlimited reach',
      '65 Featured listings',
      '50% bonus tokens + priority support',
    ],
  },
];

const TOKEN_USES = [
  { action: 'WhatsApp Lead', cost: 2, desc: 'A buyer taps WhatsApp on your listing' },
  { action: 'Featured Listing', cost: 50, desc: 'Pin your listing to the top of search results for 7 days' },
  { action: 'Magazine Half-Page', cost: 60, desc: 'Print advertisement in Property Herald magazine' },
  { action: 'Show Apartment Booking', cost: 5, desc: 'A buyer books a site visit at your project' },
  { action: 'Submit Listing', cost: 25, desc: 'List a new property on the platform' },
];

export function PricingPage() {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <Layout>
      <div className="min-h-screen" style={{ backgroundColor: '#fdf8f0' }}>
        {/* Hero */}
        <div className="bg-navy text-cream py-16 px-4 text-center">
          <p className="text-gold text-sm font-semibold tracking-widest uppercase mb-3">Token Economy</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, Honest Pricing</h1>
          <p className="text-cream/70 text-lg max-w-2xl mx-auto">
            One token costs exactly{' '}
            <span className="text-gold font-bold">₹20</span>. Buy more, pay less per token. No hidden fees, no subscriptions.
          </p>
        </div>

        {/* Biryani Philosophy */}
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div
            className="rounded-2xl border-2 p-8 text-center"
            style={{ borderColor: '#c9a84c', backgroundColor: 'white' }}
          >
            <div className="text-4xl mb-4">🍛</div>
            <h2 className="text-2xl font-bold mb-3" style={{ color: '#0a1628' }}>
              The Biryani Philosophy
            </h2>
            <p className="text-gray-600 leading-relaxed text-base max-w-xl mx-auto">
              A good biryani costs what it costs — premium rice, slow-cooked, no shortcuts.
              We charge for value delivered, not for sitting at the table. You only pay when a
              real buyer reaches out, not for impressions that go nowhere.
            </p>
            <div className="mt-6 flex justify-center gap-8 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: '#c9a84c' }}>₹20</div>
                <div className="text-gray-500">per token</div>
              </div>
              <div className="w-px bg-gray-200" />
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: '#c9a84c' }}>0</div>
                <div className="text-gray-500">monthly fees</div>
              </div>
              <div className="w-px bg-gray-200" />
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: '#c9a84c' }}>∞</div>
                <div className="text-gray-500">validity</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bundles */}
        <div className="max-w-6xl mx-auto px-4 pb-12">
          <h2 className="text-3xl font-bold text-center mb-2" style={{ color: '#0a1628' }}>
            Token Bundles
          </h2>
          <p className="text-center text-gray-500 mb-10">Bigger bundles, better value. Tokens never expire.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {BUNDLES.map((bundle) => {
              const isHovered = hoveredId === bundle.id;
              return (
                <div
                  key={bundle.id}
                  onMouseEnter={() => setHoveredId(bundle.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`relative rounded-2xl border-2 p-6 flex flex-col transition-all duration-200 cursor-pointer ${bundle.color} ${bundle.borderColor} ${
                    isHovered ? 'shadow-xl -translate-y-1' : 'shadow-sm'
                  } ${bundle.popular ? 'ring-2 ring-gold ring-offset-2' : ''}`}
                  onClick={() => navigate('/tokens')}
                >
                  {bundle.popular && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: '#c9a84c' }}
                    >
                      Most Popular
                    </div>
                  )}

                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: '#0a1628', color: '#c9a84c' }}
                  >
                    {bundle.icon}
                  </div>

                  <h3 className="text-xl font-bold mb-1" style={{ color: '#0a1628' }}>
                    {bundle.name}
                  </h3>

                  <div className="mb-1">
                    <span className="text-3xl font-bold" style={{ color: '#0a1628' }}>
                      ₹{bundle.price.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div
                    className="text-sm font-semibold mb-4"
                    style={{ color: '#c9a84c' }}
                  >
                    {bundle.tokens.toLocaleString()} tokens
                  </div>

                  <ul className="space-y-2 flex-1 mb-5">
                    {bundle.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {perk}
                      </li>
                    ))}
                  </ul>

                  <button
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
                    style={{
                      backgroundColor: bundle.popular ? '#c9a84c' : '#0a1628',
                      color: 'white',
                    }}
                  >
                    Buy Now
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Token uses table */}
        <div className="max-w-3xl mx-auto px-4 pb-16">
          <h2 className="text-3xl font-bold text-center mb-2" style={{ color: '#0a1628' }}>
            What Tokens Buy
          </h2>
          <p className="text-center text-gray-500 mb-8">Pay only for what you use. No surprises.</p>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#0a1628' }}>
                  <th className="text-left px-5 py-3 text-cream font-semibold">Action</th>
                  <th className="text-center px-5 py-3 text-cream font-semibold">Tokens</th>
                  <th className="text-left px-5 py-3 text-cream font-semibold hidden sm:table-cell">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {TOKEN_USES.map((item, i) => (
                  <tr
                    key={i}
                    className="hover:bg-amber-50/50 transition-colors"
                  >
                    <td className="px-5 py-4 font-semibold" style={{ color: '#0a1628' }}>
                      {item.action}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className="inline-block px-3 py-0.5 rounded-full text-xs font-bold"
                        style={{ backgroundColor: '#c9a84c22', color: '#c9a84c' }}
                      >
                        {item.cost}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500 hidden sm:table-cell">{item.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-navy py-16 px-4 text-center">
          <h2 className="text-3xl font-bold text-cream mb-3">Ready to get started?</h2>
          <p className="text-cream/60 mb-8">
            Get listed on India's premier Mumbai-Pune corridor real estate platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-3 rounded-xl font-semibold text-navy transition-all hover:opacity-90"
              style={{ backgroundColor: '#c9a84c' }}
            >
              Create Free Account
            </button>
            <button
              onClick={() => navigate('/tokens')}
              className="px-8 py-3 rounded-xl font-semibold text-cream border-2 border-cream/30 hover:border-cream/60 transition-all"
            >
              Buy Tokens
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
