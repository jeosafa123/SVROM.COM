import { createClient } from '@supabase/supabase-js';
import { handleError } from './utils';

// Usar variáveis de ambiente para as chaves do Supabase
const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SB_URL || !SB_KEY) {
  console.error('Supabase URL and Anon Key must be provided in environment variables.');
}

export const supabase = createClient(SB_URL || '', SB_KEY || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Helper para verificar conexão
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('perfis').select('id').limit(1);
    if (error) throw error;
    return true;
  } catch (err) {
    handleError(err, 'Conexão com Banco de Dados');
    return false;
  }
};
