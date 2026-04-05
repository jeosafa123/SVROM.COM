-- Tabela de Impressoras
CREATE TABLE IF NOT EXISTS public.impressoras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    modelo TEXT NOT NULL,
    numero_serie TEXT UNIQUE,
    patrimonio TEXT,
    localizacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.impressoras ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
CREATE POLICY "Impressoras: acesso por empresa" ON public.impressoras FOR ALL USING (empresa_id = public.get_user_empresa_id());
