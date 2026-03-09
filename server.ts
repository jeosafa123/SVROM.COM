import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());

// API Endpoint para exportação de dados (Google Sheets)
app.get('/api/export', async (req, res) => {
  const apiKey = req.query.api_key as string;

  if (!apiKey) {
    return res.status(401).json({ error: 'Chave de API não fornecida' });
  }

  try {
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
    // Nota: Como estamos no servidor, precisamos garantir que o RLS permita isso
    // ou usar uma service role key. Aqui usaremos a anon key, então o RLS deve estar configurado.
    // No nosso caso, o RLS de servicos usa get_user_empresa_id() que depende de auth.uid().
    // Como não estamos autenticados no servidor, o RLS vai bloquear.
    // SOLUÇÃO: Para este endpoint específico, usaremos uma query direta que ignora RLS se possível,
    // ou assumimos que o desenvolvedor configurou uma política adequada.
    // No Supabase, a anon key sempre respeita RLS.
    
    // Para fins de demonstração e funcionalidade, vamos tentar buscar.
    // Se falhar por RLS, avisaremos.
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
    res.status(500).json({ error: 'Erro interno do servidor' });
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
