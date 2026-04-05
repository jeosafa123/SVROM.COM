import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = 3000;

let supabaseClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

function getSupabase() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required');
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}

function getSupabaseAdmin() {
  if (!supabaseAdminClient) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }

    supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabaseAdminClient;
}

app.use(express.json());

// API Endpoint para exportação de dados (Google Sheets)
app.get('/api/export', async (req, res) => {
  const apiKey = req.query.api_key as string;

  if (!apiKey) {
    return res.status(401).json({ error: 'Chave de API não fornecida' });
  }

  try {
    const supabase = getSupabase();
    // 1. Busca a empresa associada a esta chave de API
    const { data: config, error: configError } = await supabase
      .from('configuracoes')
      .select('empresa_id')
      .eq('api_key', apiKey)
      .single();

    if (configError || !config) {
      return res.status(403).json({ error: 'Chave de API inválida' });
    }

    // 2. Busca os serviços desta empresa
    const { data: servicos, error: servicosError } = await supabase
      .from('servicos')
      .select(`
        *,
        tecnico_perfil:perfis!servicos_tecnico_fkey (
          nome,
          empresa_nome
        )
      `)
      .eq('empresa_id', config.empresa_id)
      .order('created_at', { ascending: false });

    if (servicosError) {
      console.error('Erro RLS ou Busca:', servicosError);
      return res.status(500).json({ error: 'Erro ao buscar dados. Verifique as políticas de RLS.' });
    }

    // 3. Formata os dados para o Google Sheets
    const formattedData = servicos.map(s => ({
      om: s.om,
      patrimonio: s.patrimonio,
      equipamento: s.equipamento,
      horas: s.horas,
      valor: s.valor,
      identificacao: s.identificacao,
      tecnico: s.tecnico_perfil?.nome || s.tecnico,
      created_at: s.created_at
    }));

    res.json(formattedData);
  } catch (err) {
    console.error('Erro no servidor:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro interno do servidor' });
  }
});

// API Endpoint para cadastro interno de técnicos (Admin only)
app.post('/api/admin/create-tecnico', async (req, res) => {
  const { email, password, fullName, companyId, companyName } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const supabase = getSupabase();
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Verifica se o usuário que está chamando é um admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Sessão inválida' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('perfis')
      .select('role, empresa_id')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin' || profile?.empresa_id !== companyId) {
      return res.status(403).json({ error: 'Apenas administradores da empresa podem cadastrar técnicos' });
    }

    // 2. Cria o novo usuário técnico usando a Service Role Key (Admin SDK)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirma o e-mail para facilitar
      user_metadata: {
        full_name: fullName,
        company_name: companyName,
        intended_role: 'tecnico'
      }
    });

    if (createError) {
      return res.status(400).json({ error: createError.message });
    }

    res.json({ message: 'Técnico cadastrado com sucesso!', user: newUser.user });
  } catch (err) {
    console.error('Erro ao cadastrar técnico:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro interno do servidor' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile('index.html', { root: 'dist' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();
