import { createClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !anonKey) {
  throw new Error('Missing Supabase environment variables');
}
export const supabase = createClient(supabaseUrl, anonKey);
