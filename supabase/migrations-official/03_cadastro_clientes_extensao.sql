-- =========================================================
-- 03_cadastro_clientes_extensao.sql  (aditivo, idempotente)
-- Projeto: ywvhoctcmibjitvwkkhb
--
-- Consolida cadastro_clientes como fonte oficial de verdade.
-- NÃO altera base_metricas. NÃO faz DROP/ALTER TYPE/RENAME/DELETE.
-- Todas as colunas pré-existentes (id bigint, nome_cliente, *_ativo text,
-- meta_ativo, google_business_location_id, created_at) são preservadas.
-- Flags de plataforma vindas do Make (text) permanecem text; o frontend
-- normaliza para boolean.
-- =========================================================

-- ---------- 1. Colunas aditivas em cadastro_clientes ----------
ALTER TABLE public.cadastro_clientes
  ADD COLUMN IF NOT EXISTS ativo            boolean      NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS slug             text,
  ADD COLUMN IF NOT EXISTS email_principal  text,
  ADD COLUMN IF NOT EXISTS telefone         text,
  ADD COLUMN IF NOT EXISTS empresa          text,
  ADD COLUMN IF NOT EXISTS observacoes      text,
  ADD COLUMN IF NOT EXISTS instagram_ativo  boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mlabs_url        text,
  ADD COLUMN IF NOT EXISTS data_inicio      date,
  ADD COLUMN IF NOT EXISTS valor_mensal     numeric(12,2),
  ADD COLUMN IF NOT EXISTS updated_at       timestamptz  NOT NULL DEFAULT now();

-- Unicidade do slug (idempotente; só cria se não existir)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cadastro_clientes_slug_key'
  ) THEN
    ALTER TABLE public.cadastro_clientes
      ADD CONSTRAINT cadastro_clientes_slug_key UNIQUE (slug);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_cadastro_clientes_slug
  ON public.cadastro_clientes (slug);

-- Trigger genérico para manter updated_at (aditivo; só ATUALIZA timestamp)
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'tg_cadastro_clientes_set_updated_at'
      AND tgrelid = 'public.cadastro_clientes'::regclass
  ) THEN
    CREATE TRIGGER tg_cadastro_clientes_set_updated_at
      BEFORE UPDATE ON public.cadastro_clientes
      FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
  END IF;
END $$;

-- ---------- 2. GRANTs e RLS em cadastro_clientes ----------
GRANT SELECT, INSERT, UPDATE ON public.cadastro_clientes TO authenticated;
GRANT ALL ON public.cadastro_clientes TO service_role;
-- Sequência do bigint id (necessária para INSERT pelo CRUD admin)
DO $$
DECLARE seq_name text;
BEGIN
  SELECT pg_get_serial_sequence('public.cadastro_clientes','id') INTO seq_name;
  IF seq_name IS NOT NULL THEN
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO authenticated', seq_name);
    EXECUTE format('GRANT ALL ON SEQUENCE %s TO service_role', seq_name);
  END IF;
END $$;

ALTER TABLE public.cadastro_clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cadastro_clientes_admin_all" ON public.cadastro_clientes;
CREATE POLICY "cadastro_clientes_admin_all" ON public.cadastro_clientes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "cadastro_clientes_select_proprio" ON public.cadastro_clientes;
CREATE POLICY "cadastro_clientes_select_proprio" ON public.cadastro_clientes
  FOR SELECT TO authenticated
  USING (
    nome_cliente IN (SELECT cliente_nome FROM public.current_user_clientes())
  );

-- ---------- 3. client_access.cadastro_cliente_id (aditivo) ----------
ALTER TABLE public.client_access
  ADD COLUMN IF NOT EXISTS cadastro_cliente_id bigint
    REFERENCES public.cadastro_clientes(id) ON DELETE SET NULL;

-- Trigger: ao inserir/atualizar client_access, tenta popular cadastro_cliente_id
-- automaticamente quando o nome bate. Não falha se não encontrar.
CREATE OR REPLACE FUNCTION public.tg_client_access_link_cadastro()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.cadastro_cliente_id IS NULL AND NEW.cliente_nome IS NOT NULL THEN
    SELECT cc.id INTO NEW.cadastro_cliente_id
    FROM public.cadastro_clientes cc
    WHERE cc.nome_cliente = NEW.cliente_nome
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'tg_client_access_link_cadastro'
      AND tgrelid = 'public.client_access'::regclass
  ) THEN
    CREATE TRIGGER tg_client_access_link_cadastro
      BEFORE INSERT OR UPDATE ON public.client_access
      FOR EACH ROW EXECUTE FUNCTION public.tg_client_access_link_cadastro();
  END IF;
END $$;

-- ---------- 4. servicos ----------
CREATE TABLE IF NOT EXISTS public.servicos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text UNIQUE NOT NULL,
  descricao   text,
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.servicos TO authenticated;
GRANT ALL ON public.servicos TO service_role;

ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "servicos_select_all_auth" ON public.servicos;
CREATE POLICY "servicos_select_all_auth" ON public.servicos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "servicos_admin_all" ON public.servicos;
CREATE POLICY "servicos_admin_all" ON public.servicos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'tg_servicos_set_updated_at'
      AND tgrelid = 'public.servicos'::regclass
  ) THEN
    CREATE TRIGGER tg_servicos_set_updated_at
      BEFORE UPDATE ON public.servicos
      FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
  END IF;
END $$;

-- Seed idempotente
INSERT INTO public.servicos (nome, descricao) VALUES
  ('Gestão de Tráfego',     'Campanhas pagas em Google Ads, Meta Ads e demais plataformas'),
  ('Social Media',          'Gestão de redes sociais, conteúdo e engajamento'),
  ('Desenvolvimento Web',   'Sites, landing pages e aplicações web'),
  ('Google Meu Negócio',    'Gestão de perfil GMB / Google Business Profile'),
  ('SEO',                   'Otimização para mecanismos de busca'),
  ('Consultoria',           'Consultoria estratégica de marketing digital'),
  ('Automação',             'Automações com Make, Zapier e fluxos personalizados')
ON CONFLICT (nome) DO NOTHING;

-- ---------- 5. cliente_servicos ----------
CREATE TABLE IF NOT EXISTS public.cliente_servicos (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_cliente_id  bigint NOT NULL REFERENCES public.cadastro_clientes(id) ON DELETE RESTRICT,
  servico_id           uuid   NOT NULL REFERENCES public.servicos(id)          ON DELETE RESTRICT,
  ativo                boolean NOT NULL DEFAULT true,
  valor                numeric(12,2),
  observacoes          text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cadastro_cliente_id, servico_id)
);

GRANT SELECT, INSERT, UPDATE ON public.cliente_servicos TO authenticated;
GRANT ALL ON public.cliente_servicos TO service_role;

ALTER TABLE public.cliente_servicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cliente_servicos_admin_all" ON public.cliente_servicos;
CREATE POLICY "cliente_servicos_admin_all" ON public.cliente_servicos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "cliente_servicos_select_proprio" ON public.cliente_servicos;
CREATE POLICY "cliente_servicos_select_proprio" ON public.cliente_servicos
  FOR SELECT TO authenticated
  USING (
    cadastro_cliente_id IN (
      SELECT id FROM public.cadastro_clientes
      WHERE nome_cliente IN (SELECT cliente_nome FROM public.current_user_clientes())
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'tg_cliente_servicos_set_updated_at'
      AND tgrelid = 'public.cliente_servicos'::regclass
  ) THEN
    CREATE TRIGGER tg_cliente_servicos_set_updated_at
      BEFORE UPDATE ON public.cliente_servicos
      FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
  END IF;
END $$;

-- ---------- 6. View de conveniência: clientes com serviços agregados ----------
CREATE OR REPLACE VIEW public.vw_clientes_admin
WITH (security_invoker = on) AS
SELECT
  cc.id,
  cc.nome_cliente,
  cc.slug,
  cc.ativo,
  cc.empresa,
  cc.email_principal,
  cc.telefone,
  cc.data_inicio,
  cc.valor_mensal,
  cc.mlabs_url,
  cc.observacoes,
  cc.google_ads_ativo,
  cc.meta_ativo,
  cc.ga4_ativo,
  cc.instagram_ativo,
  cc.google_business_ativo,
  cc.google_business_location_id,
  cc.created_at,
  cc.updated_at,
  COALESCE((
    SELECT array_agg(s.nome ORDER BY s.nome)
    FROM public.cliente_servicos cs
    JOIN public.servicos s ON s.id = cs.servico_id
    WHERE cs.cadastro_cliente_id = cc.id AND cs.ativo = true
  ), ARRAY[]::text[]) AS servicos,
  (SELECT count(*) FROM public.client_access ca WHERE ca.cliente_nome = cc.nome_cliente) AS qtd_acessos
FROM public.cadastro_clientes cc;

GRANT SELECT ON public.vw_clientes_admin TO authenticated;

-- ---------- 7. Índice aditivo para join por nome ----------
CREATE INDEX IF NOT EXISTS idx_cadastro_clientes_nome
  ON public.cadastro_clientes (nome_cliente);
