import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://fxbzqeakbkvydxzokdii.supabase.co';

const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_OsA-DT8o0vnEzodnYiUnKw_CayGRjlH';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

