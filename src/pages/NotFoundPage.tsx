import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Home, Building2 } from 'lucide-react';

export function NotFoundPage() {
  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center bg-cream px-4">
        <div className="text-center max-w-md">
          <p className="text-8xl font-serif font-bold text-gold/30 leading-none mb-4">404</p>
          <h1 className="text-2xl font-serif font-bold text-navy mb-3">Page Not Found</h1>
          <p className="text-warm-gray mb-8">The page you're looking for doesn't exist or has been moved.</p>
          <div className="flex justify-center gap-3">
            <Link to="/" className="flex items-center gap-2 px-5 py-2.5 bg-navy text-cream font-display font-semibold text-sm rounded-xl hover:bg-navy/90 transition-colors">
              <Home className="w-4 h-4" />Go Home
            </Link>
            <Link to="/directory" className="flex items-center gap-2 px-5 py-2.5 border border-navy/20 text-navy font-display font-semibold text-sm rounded-xl hover:bg-navy/5 transition-colors">
              <Building2 className="w-4 h-4" />Browse Directory
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
