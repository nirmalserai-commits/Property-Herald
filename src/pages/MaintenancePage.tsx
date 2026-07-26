import { Clock } from 'lucide-react';

export function MaintenancePage() {
  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center px-4">
      <div className="max-w-lg text-center">
        <div className="w-20 h-20 bg-gold/10 border border-gold/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-gold" />
        </div>
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-gold mb-4">Under Maintenance</h1>
        <p className="text-cream/60">Property Herald is temporarily offline for scheduled maintenance. We'll be back shortly.</p>
      </div>
    </div>
  );
}
