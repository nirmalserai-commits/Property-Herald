import { Shield } from 'lucide-react';

const SECTIONS = [
  { title: '1. Acceptance of Terms', body: 'By accessing Property Herald ("the Platform"), you agree to be bound by these Terms and Conditions. If you do not agree, please discontinue use immediately.' },
  { title: '2. Definition of Services', body: 'Property Herald is an AI-powered real estate platform connecting developers, agencies, agents, and buyers. Services include property listings, AI assistant interactions, locality reports, token-based features, and magazine publications.' },
  { title: '3. User Registration', body: 'All users must provide accurate information during registration. Developers and agencies must provide valid RERA/GST details. Buyers may register without business credentials.' },
  { title: '4. Token Economy', body: 'Tokens are the platform currency for premium features. Tokens are non-refundable once consumed. Token bundles are available for purchase. Misuse of tokens through fraudulent means will result in account suspension.' },
  { title: '5. Listing Guidelines', body: 'All property listings undergo a three-level approval process: automated quality check (Nora), content review (Nancy), and final approval (Nirmal). Listings with false information will be rejected and may result in account penalties.' },
  { title: '6. AI Assistant Interactions', body: 'Our AI assistants (Nora, Nita, Neena, and others) provide guidance based on available data. AI suggestions do not constitute legal or financial advice. Users should verify all information independently.' },
  { title: '7. Privacy & Data Protection', body: 'We collect and store user data as described in our Privacy Policy. Conversation data with AI assistants may be stored to improve service quality. User data is never sold to third parties.' },
  { title: '8. Payment & Refunds', body: 'Payments for token bundles, subscriptions, and Naksha reports are processed through Razorpay or UPI. Refunds are issued at the discretion of management for failed transactions only.' },
  { title: '9. Prohibited Activities', body: 'Users may not: post fraudulent listings, impersonate others, scrape platform data, misuse AI assistants, or engage in any illegal activity through the Platform.' },
  { title: '10. Intellectual Property', body: 'All content on Property Herald, including the Property Herald magazine, AI personas, and platform design, is owned by Property Herald. Users retain ownership of their listings but grant us a license to display them.' },
  { title: '11. Liability Limitation', body: 'Property Herald is not liable for any losses arising from property transactions, AI suggestions, or third-party interactions on the Platform. Users engage at their own risk.' },
  { title: '12. Account Termination', body: 'We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or harm the Platform community.' },
  { title: '13. Governing Law', body: 'These Terms are governed by the laws of India. Disputes shall be resolved in courts in Mumbai, Maharashtra.' },
  { title: '14. Updates to Terms', body: 'We may update these Terms at any time. Continued use of the Platform after updates constitutes acceptance of the revised Terms.' },
];

export function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-navy text-cream py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gold/10 border border-gold/30 rounded-full mb-4">
            <Shield className="w-7 h-7 text-gold" />
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-gold mb-2">Terms & Conditions</h1>
          <p className="text-cream/50 text-sm">Last updated: 24 July 2026</p>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="space-y-6">
          {SECTIONS.map(s => (
            <div key={s.title} className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-serif font-bold text-navy mb-2">{s.title}</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
