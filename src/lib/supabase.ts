import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://agsqbuwufulwevqjmhab.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_zgvFZ2_MVuuzTRvbwyABkA_oXuSEu15';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-project.supabase.co'
);

// Client-safe Supabase instance (respects RLS)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

// Server-only Admin Client with Service Role (Bypasses RLS strictly for Webhooks & Token validation)
export const supabaseAdmin = Boolean(isSupabaseConfigured && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;
