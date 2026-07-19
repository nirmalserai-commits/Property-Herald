import { createClient } from '@supabase/supabase-js';

const remoteUrl = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!remoteUrl || !anonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Route Supabase requests through a same-origin proxy (/supabase/*) so the
// browser never makes cross-origin calls. public/_redirects rewrites
// /supabase/* -> <supabase-url>/* with a 200 (proxy) status on Bolt hosting.
// The Vite dev server proxy in vite.config.ts handles the same rewrite locally.
// supabase-js requires an absolute URL, so resolve the proxy path against the
// current origin (http://localhost:5173 in dev, the deployed origin in prod).
export const supabaseUrl = `${window.location.origin}/supabase`;
export const supabaseAnonKey = anonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
