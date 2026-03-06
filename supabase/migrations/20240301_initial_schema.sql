-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Limpar Schema Antigo (Garante que a substituição seja limpa)
DROP TABLE IF EXISTS public.servicos CASCADE;
DROP TABLE IF EXISTS public.configuracoes CASCADE;
DROP TABLE IF EXISTS public.perfis CASCADE;
DROP TABLE IF EXISTS public.empresas CASCADE;

-- 3. Tabela de Empresas
CREATE TABLE public.empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Perfis (Vinculada ao Auth do Supabase)
CREATE TABLE public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    nome TEXT,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
    role TEXT CHECK (role IN ('admin', 'tecnico', 'cliente')) DEFAULT 'tecnico',
    empresa_nome TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Serviços
CREATE TABLE public.servicos (
    id BIGSERIAL PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    tecnico UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    om TEXT NOT NULL,
    patrimonio TEXT,
    equipamento TEXT NOT NULL,
    horas NUMERIC(10, 2) NOT NULL,
    valor NUMERIC(10, 2) NOT NULL,
    identificacao BOOLEAN DEFAULT FALSE,
    data_inicio TIMESTAMP WITH TIME ZONE,
    data_fim TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'concluido',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela de Configurações de API
CREATE TABLE public.configuracoes (
    empresa_id UUID PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
    api_url TEXT,
    api_key TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Configurar Row Level Security (RLS)
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- 8. Funções Auxiliares para RLS
CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS UUID AS $$
  SELECT empresa_id FROM public.perfis WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 9. Políticas de Segurança (RLS)
CREATE POLICY "Empresas: visualização por membros" ON public.empresas FOR SELECT USING (id = public.get_user_empresa_id());
CREATE POLICY "Empresas: inserção por usuários autenticados" ON public.empresas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Perfis: acesso individual" ON public.perfis FOR ALL USING (id = auth.uid());
CREATE POLICY "Perfis: inserção por usuários autenticados" ON public.perfis FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Perfis: admin_view_company" ON public.perfis FOR SELECT USING (empresa_id = public.get_user_empresa_id() AND public.is_admin());

CREATE POLICY "Serviços: acesso por empresa" ON public.servicos FOR ALL USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Configurações: acesso admin" ON public.configuracoes FOR ALL USING (empresa_id = public.get_user_empresa_id() AND public.is_admin());

-- 10. Função RPC para Exclusão de Conta
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- 11. Trigger para criar perfil automático no cadastro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $
DECLARE
  company_id UUID;
  company_name TEXT;
  user_role TEXT;
  user_name TEXT;
BEGIN
  company_name := COALESCE(new.raw_user_meta_data->>'company_name', 'Empresa Individual');
  user_role := COALESCE(new.raw_user_meta_data->>'intended_role', 'tecnico');
  user_name := COALESCE(new.raw_user_meta_data->>'full_name', new.email);

  -- Tenta encontrar a empresa pelo nome
  SELECT id INTO company_id FROM public.empresas WHERE nome = company_name LIMIT 1;

  -- Se for admin e a empresa não existir, cria ela
  IF company_id IS NULL AND user_role = 'admin' THEN
    INSERT INTO public.empresas (nome) VALUES (company_name) RETURNING id INTO company_id;
  END IF;

  INSERT INTO public.perfis (id, nome, empresa_id, role, empresa_nome)
  VALUES (
    new.id,
    user_name,
    company_id,
    user_role,
    company_name
  );
  RETURN new;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que o trigger seja criado apenas se não existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 12. SEED DATA: Criação do Usuário Admin e Empresa Inicial
DO $$
DECLARE
  new_user_id UUID := uuid_generate_v4();
  new_empresa_id UUID := uuid_generate_v4();
BEGIN
  -- Criar Empresa
  INSERT INTO public.empresas (id, nome)
  VALUES (new_empresa_id, 'Vertical Locações - Matriz')
  ON CONFLICT DO NOTHING;

  -- Criar Usuário Admin no Auth (se não existir)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'jeosafa2017@gmail.com') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token,
      is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      'jeosafa2017@gmail.com',
      crypt('123456', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('company_name', 'Vertical Locações - Matriz', 'intended_role', 'admin', 'full_name', 'Administrador Vertical'),
      now(),
      now(),
      '',
      '',
      '',
      '',
      false
    );

    -- O trigger handle_new_user() cuidará de criar o perfil automaticamente
    -- mas vamos garantir que o perfil esteja correto caso o trigger falhe ou já exista
    INSERT INTO public.perfis (id, nome, empresa_id, role, empresa_nome)
    VALUES (new_user_id, 'Administrador Vertical', new_empresa_id, 'admin', 'Vertical Locações - Matriz')
    ON CONFLICT (id) DO UPDATE SET 
      nome = 'Administrador Vertical',
      role = 'admin',
      empresa_id = new_empresa_id,
      empresa_nome = 'Vertical Locações - Matriz';
  ELSE
    -- Se o usuário já existe, garante que ele seja admin no perfil
    UPDATE public.perfis 
    SET role = 'admin' 
    WHERE id = (SELECT id FROM auth.users WHERE email = 'jeosafa2017@gmail.com');
  END IF;
END $$;
