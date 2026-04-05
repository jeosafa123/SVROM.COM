import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseClient: SupabaseClient | null = null;

export const getSupabase = () => {
  if (!supabaseClient) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase URL or Anon Key is missing. Check your environment variables.');
      // Return a dummy client or handle it in the UI
      // For now, we'll try to create it anyway to avoid breaking existing imports if they expect a client
      // but we should ideally use a proxy or a more robust pattern.
    }
    supabaseClient = createClient(supabaseUrl || '', supabaseAnonKey || '');
  }
  return supabaseClient;
};

// For backward compatibility with existing imports
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
