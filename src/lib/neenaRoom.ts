import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Dedicated client for the Neena room. Uses a separate localStorage key
// so the boardroom auth session never collides with the main admin session.
export const neenaRoom = createClient(supabaseUrl, anonKey, {
  auth: {
    storageKey: 'neena-room-auth',
    persistSession: true,
    autoRefreshToken: true,
  },
});
