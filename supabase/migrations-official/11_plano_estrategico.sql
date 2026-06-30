-- =========================================================
-- 11_plano_estrategico.sql  (aditivo, idempotente)
-- Plano Estratégico — Centro de Inteligência Operacional.
-- NÃO altera base_metricas, cadastro_clientes (exceto FK editorial).
-- =========================================================

-- ---------- ENUMs ----------
DO $$ BEGIN
  CREATE TYPE public.plano_status AS ENUM (
    'rascunho', 'ativo', 'pausado', 'concluido', 'arquivado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.plano_prioridade AS ENUM ('alta', 'media', 'baixa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.plano_item_status AS ENUM (
    'pendente', 'em_andamento', 'concluido', 'cancelado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.plano_evento_tipo AS ENUM (
    'criacao', 'edicao', 'comentario', 'conclusao', 'mudanca_meta',
    'mudanca_responsavel', 'mudanca_status', 'decisao', 'aprendizado', 'proposta_edicao'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hipotese_status AS ENUM (
    'aberta', 'em_teste', 'validada', 'invalidada'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.oportunidade_origem AS ENUM ('manual', 'regra', 'ia');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.decisao_resultado_status AS ENUM (
    'pendente', 'positivo', 'negativo', 'neutro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.roadmap_marco_tipo AS ENUM (
    'inicio', 'semana', 'marco', 'conclusao'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- planos_estrategicos ----------
CREATE TABLE IF NOT EXISTS public.planos_estrategicos (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_cliente_id  bigint NOT NULL REFERENCES public.cadastro_clientes(id) ON DELETE CASCADE,
  cliente_nome         text NOT NULL,
  titulo               text NOT NULL,
  descricao            text,
  periodo_inicio       date NOT NULL,
  periodo_fim          date NOT NULL,
  status               public.plano_status NOT NULL DEFAULT 'rascunho',
  objetivo_principal   text,
  observacoes          text,
  ai_metadata          jsonb,
  created_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS planos_estrategicos_cliente_idx
  ON public.planos_estrategicos (cadastro_cliente_id, status);
CREATE INDEX IF NOT EXISTS planos_estrategicos_cliente_nome_idx
  ON public.planos_estrategicos (cliente_nome);

-- ---------- plano_objetivos ----------
CREATE TABLE IF NOT EXISTS public.plano_objetivos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id           uuid NOT NULL REFERENCES public.planos_estrategicos(id) ON DELETE CASCADE,
  titulo             text NOT NULL,
  descricao          text,
  meta_numerica      numeric,
  data_alvo          date,
  progresso_manual   numeric,
  status             public.plano_item_status NOT NULL DEFAULT 'pendente',
  ordem              int NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plano_objetivos_plano_idx
  ON public.plano_objetivos (plano_id, ordem);

-- ---------- plano_estrategias (criada antes da junction e editorial FK) ----------
CREATE TABLE IF NOT EXISTS public.plano_estrategias (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id           uuid NOT NULL REFERENCES public.planos_estrategicos(id) ON DELETE CASCADE,
  titulo             text NOT NULL,
  descricao          text,
  prioridade         public.plano_prioridade NOT NULL DEFAULT 'media',
  peso_percentual    numeric(5,2) NOT NULL DEFAULT 0
    CHECK (peso_percentual >= 0 AND peso_percentual <= 100),
  status             public.plano_item_status NOT NULL DEFAULT 'pendente',
  responsavel_email  text,
  data_prevista      date,
  comentarios        text,
  ordem              int NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plano_estrategias_plano_idx
  ON public.plano_estrategias (plano_id, ordem);

-- ---------- plano_objetivo_estrategias (junction) ----------
CREATE TABLE IF NOT EXISTS public.plano_objetivo_estrategias (
  objetivo_id    uuid NOT NULL REFERENCES public.plano_objetivos(id) ON DELETE CASCADE,
  estrategia_id  uuid NOT NULL REFERENCES public.plano_estrategias(id) ON DELETE CASCADE,
  PRIMARY KEY (objetivo_id, estrategia_id)
);

CREATE INDEX IF NOT EXISTS plano_obj_estrategia_idx
  ON public.plano_objetivo_estrategias (estrategia_id);

-- ---------- plano_metric_refs ----------
CREATE TABLE IF NOT EXISTS public.plano_metric_refs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id       uuid NOT NULL REFERENCES public.planos_estrategicos(id) ON DELETE CASCADE,
  objetivo_id    uuid REFERENCES public.plano_objetivos(id) ON DELETE CASCADE,
  platform_key   text NOT NULL,
  metric_key     text,
  kpi_key        text,
  meta_numerica  numeric,
  positive_is_good boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plano_metric_refs_key_check CHECK (
    (metric_key IS NOT NULL AND kpi_key IS NULL)
    OR (metric_key IS NULL AND kpi_key IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS plano_metric_refs_plano_idx
  ON public.plano_metric_refs (plano_id);
CREATE INDEX IF NOT EXISTS plano_metric_refs_objetivo_idx
  ON public.plano_metric_refs (objetivo_id);

-- ---------- plano_hipoteses ----------
CREATE TABLE IF NOT EXISTS public.plano_hipoteses (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id              uuid NOT NULL REFERENCES public.planos_estrategicos(id) ON DELETE CASCADE,
  estrategia_id         uuid REFERENCES public.plano_estrategias(id) ON DELETE SET NULL,
  hipotese              text NOT NULL,
  status                public.hipotese_status NOT NULL DEFAULT 'aberta',
  resultado_percentual  numeric,
  resultado_texto       text,
  conclusao             text,
  ordem                 int NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plano_hipoteses_plano_idx
  ON public.plano_hipoteses (plano_id, ordem);

-- ---------- plano_oportunidades ----------
CREATE TABLE IF NOT EXISTS public.plano_oportunidades (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id        uuid NOT NULL REFERENCES public.planos_estrategicos(id) ON DELETE CASCADE,
  platform_key    text,
  insight         text NOT NULL,
  acao_sugerida   text NOT NULL,
  origem          public.oportunidade_origem NOT NULL DEFAULT 'manual',
  status          public.plano_item_status NOT NULL DEFAULT 'pendente',
  ordem           int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plano_oportunidades_plano_idx
  ON public.plano_oportunidades (plano_id, ordem);

-- ---------- plano_decisoes ----------
CREATE TABLE IF NOT EXISTS public.plano_decisoes (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id           uuid NOT NULL REFERENCES public.planos_estrategicos(id) ON DELETE CASCADE,
  estrategia_id      uuid REFERENCES public.plano_estrategias(id) ON DELETE SET NULL,
  titulo             text NOT NULL,
  motivo             text NOT NULL,
  responsavel_email  text,
  resultado_texto    text,
  resultado_status   public.decisao_resultado_status NOT NULL DEFAULT 'pendente',
  data_decisao       date NOT NULL DEFAULT CURRENT_DATE,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plano_decisoes_plano_idx
  ON public.plano_decisoes (plano_id, data_decisao DESC);

-- ---------- plano_aprendizados ----------
CREATE TABLE IF NOT EXISTS public.plano_aprendizados (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id        uuid NOT NULL REFERENCES public.planos_estrategicos(id) ON DELETE CASCADE,
  mes_referencia  date NOT NULL,
  titulo          text NOT NULL,
  descricao       text,
  tags            text[] NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plano_aprendizados_plano_idx
  ON public.plano_aprendizados (plano_id, mes_referencia DESC);

-- ---------- plano_roadmap_marcos ----------
CREATE TABLE IF NOT EXISTS public.plano_roadmap_marcos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id        uuid NOT NULL REFERENCES public.planos_estrategicos(id) ON DELETE CASCADE,
  titulo          text NOT NULL,
  descricao       text,
  tipo            public.roadmap_marco_tipo NOT NULL DEFAULT 'marco',
  semana_numero   int,
  data_prevista   date,
  status          public.plano_item_status NOT NULL DEFAULT 'pendente',
  ordem           int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plano_roadmap_marcos_plano_idx
  ON public.plano_roadmap_marcos (plano_id, ordem);

-- ---------- plano_acoes ----------
CREATE TABLE IF NOT EXISTS public.plano_acoes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id            uuid NOT NULL REFERENCES public.planos_estrategicos(id) ON DELETE CASCADE,
  estrategia_id       uuid REFERENCES public.plano_estrategias(id) ON DELETE SET NULL,
  titulo              text NOT NULL,
  descricao           text,
  motivo_estrategico  text NOT NULL,
  responsavel_email   text,
  data_prevista       date,
  status              public.plano_item_status NOT NULL DEFAULT 'pendente',
  sugerido            boolean NOT NULL DEFAULT false,
  ordem               int NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plano_acoes_plano_idx
  ON public.plano_acoes (plano_id, ordem);

-- ---------- plano_eventos ----------
CREATE TABLE IF NOT EXISTS public.plano_eventos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id      uuid NOT NULL REFERENCES public.planos_estrategicos(id) ON DELETE CASCADE,
  entity_type   text,
  entity_id     uuid,
  tipo          public.plano_evento_tipo NOT NULL,
  autor_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_email   text,
  mensagem      text,
  payload       jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plano_eventos_plano_idx
  ON public.plano_eventos (plano_id, created_at DESC);

-- ---------- plano_snapshots ----------
CREATE TABLE IF NOT EXISTS public.plano_snapshots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id     uuid NOT NULL REFERENCES public.planos_estrategicos(id) ON DELETE CASCADE,
  snapshot     jsonb NOT NULL,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plano_snapshots_plano_idx
  ON public.plano_snapshots (plano_id, created_at DESC);

-- ---------- Editorial FK ----------
ALTER TABLE public.posts_editorial
  ADD COLUMN IF NOT EXISTS estrategia_id uuid
  REFERENCES public.plano_estrategias(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS posts_editorial_estrategia_idx
  ON public.posts_editorial (estrategia_id);

-- ---------- View editorial stats ----------
CREATE OR REPLACE VIEW public.vw_estrategia_editorial_stats AS
SELECT
  p.estrategia_id,
  p.status,
  count(*)::bigint AS total
FROM public.posts_editorial p
WHERE p.estrategia_id IS NOT NULL
GROUP BY p.estrategia_id, p.status;

GRANT SELECT ON public.vw_estrategia_editorial_stats TO authenticated;
GRANT SELECT ON public.vw_estrategia_editorial_stats TO service_role;

-- ---------- updated_at triggers ----------
CREATE OR REPLACE FUNCTION public.tg_plano_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'planos_estrategicos', 'plano_objetivos', 'plano_estrategias',
    'plano_hipoteses', 'plano_oportunidades', 'plano_decisoes',
    'plano_aprendizados', 'plano_roadmap_marcos', 'plano_acoes'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_touch ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER %I_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tg_plano_touch()',
      t, t
    );
  END LOOP;
END $$;

-- ---------- GRANTs ----------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planos_estrategicos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plano_objetivos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plano_estrategias TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plano_objetivo_estrategias TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plano_metric_refs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plano_hipoteses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plano_oportunidades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plano_decisoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plano_aprendizados TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plano_roadmap_marcos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plano_acoes TO authenticated;
GRANT SELECT, INSERT ON public.plano_eventos TO authenticated;
GRANT SELECT, INSERT ON public.plano_snapshots TO authenticated;

GRANT ALL ON public.planos_estrategicos TO service_role;
GRANT ALL ON public.plano_objetivos TO service_role;
GRANT ALL ON public.plano_estrategias TO service_role;
GRANT ALL ON public.plano_objetivo_estrategias TO service_role;
GRANT ALL ON public.plano_metric_refs TO service_role;
GRANT ALL ON public.plano_hipoteses TO service_role;
GRANT ALL ON public.plano_oportunidades TO service_role;
GRANT ALL ON public.plano_decisoes TO service_role;
GRANT ALL ON public.plano_aprendizados TO service_role;
GRANT ALL ON public.plano_roadmap_marcos TO service_role;
GRANT ALL ON public.plano_acoes TO service_role;
GRANT ALL ON public.plano_eventos TO service_role;
GRANT ALL ON public.plano_snapshots TO service_role;

-- ---------- RLS ----------
ALTER TABLE public.planos_estrategicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plano_objetivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plano_estrategias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plano_objetivo_estrategias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plano_metric_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plano_hipoteses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plano_oportunidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plano_decisoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plano_aprendizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plano_roadmap_marcos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plano_acoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plano_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plano_snapshots ENABLE ROW LEVEL SECURITY;

-- Admin: full access on all plan tables
DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'planos_estrategicos', 'plano_objetivos', 'plano_estrategias',
    'plano_objetivo_estrategias', 'plano_metric_refs', 'plano_hipoteses',
    'plano_oportunidades', 'plano_decisoes', 'plano_aprendizados',
    'plano_roadmap_marcos', 'plano_acoes', 'plano_eventos', 'plano_snapshots'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_admin_all ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I_admin_all ON public.%I FOR ALL TO authenticated
       USING (public.has_role(auth.uid(), ''admin''))
       WITH CHECK (public.has_role(auth.uid(), ''admin''))',
      tbl, tbl
    );
  END LOOP;
END $$;

-- Client: read own client plans
DROP POLICY IF EXISTS planos_estrategicos_client_select ON public.planos_estrategicos;
CREATE POLICY planos_estrategicos_client_select ON public.planos_estrategicos
  FOR SELECT TO authenticated
  USING (cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes()));

DROP POLICY IF EXISTS planos_estrategicos_client_write ON public.planos_estrategicos;
CREATE POLICY planos_estrategicos_client_write ON public.planos_estrategicos
  FOR ALL TO authenticated
  USING (cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes()))
  WITH CHECK (cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes()));

-- Child tables: inherit via plano join
DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'plano_objetivos', 'plano_estrategias', 'plano_metric_refs',
    'plano_hipoteses', 'plano_oportunidades', 'plano_decisoes',
    'plano_aprendizados', 'plano_roadmap_marcos', 'plano_acoes',
    'plano_eventos', 'plano_snapshots'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_client_all ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I_client_all ON public.%I FOR ALL TO authenticated
       USING (
         plano_id IN (
           SELECT id FROM public.planos_estrategicos
           WHERE cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
         )
       )
       WITH CHECK (
         plano_id IN (
           SELECT id FROM public.planos_estrategicos
           WHERE cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
         )
       )',
      tbl, tbl
    );
  END LOOP;
END $$;

-- Junction: via objetivo or estrategia
DROP POLICY IF EXISTS plano_objetivo_estrategias_client_all ON public.plano_objetivo_estrategias;
CREATE POLICY plano_objetivo_estrategias_client_all ON public.plano_objetivo_estrategias
  FOR ALL TO authenticated
  USING (
    objetivo_id IN (
      SELECT o.id FROM public.plano_objetivos o
      JOIN public.planos_estrategicos p ON p.id = o.plano_id
      WHERE p.cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    )
  )
  WITH CHECK (
    objetivo_id IN (
      SELECT o.id FROM public.plano_objetivos o
      JOIN public.planos_estrategicos p ON p.id = o.plano_id
      WHERE p.cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    )
  );

-- =========================================================
-- Validação (executar manualmente após apply):
-- SELECT count(*) FROM pg_tables WHERE tablename LIKE 'plano_%';
-- SELECT * FROM vw_estrategia_editorial_stats LIMIT 1;
-- =========================================================
