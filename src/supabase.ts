import { createClient } from '@supabase/supabase-js';

// Note: sb_publishable_... is a public client key meant to be bundled in the browser.
// Data security is enforced server-side by Supabase Auth and Postgres RLS (user_id = auth.uid()).
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://fxbzqeakbkvydxzokdii.supabase.co';

const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_OsA-DT8o0vnEzodnYiUnKw_CayGRjlH';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
