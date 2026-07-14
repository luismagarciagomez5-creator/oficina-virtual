import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

// `createClient` throws immediately on an empty URL, so only construct a
// real client once both env vars are present. Callers must check
// `isSupabaseConfigured` before touching `supabase`.
export const supabase = isSupabaseConfigured ? createClient(url!, anonKey!) : null;
