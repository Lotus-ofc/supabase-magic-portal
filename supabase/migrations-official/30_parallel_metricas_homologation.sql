-- =========================================================
-- 30_parallel_metricas_homologation.sql  (aditivo, idempotente)
-- Homologation Database — base paralela Make × Hub
-- Make → base_metricas_make | Hub → base_metricas_hub
-- Dashboards → vw_metricas (abstração; cutover = trocar fonte)
-- =========================================================

-- ---------- 1. Renomear produção Make (estratégia: RENAME — zero cópia, atômico) ----------
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'base_metricas'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'base_metricas_make'
  ) THEN
    ALTER TABLE public.base_metricas RENAME TO base_metricas_make;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'base_metricas_make'
  ) THEN
    CREATE TABLE public.base_metricas_make (
      id bigserial PRIMARY KEY,
      data date NOT NULL,
      cliente text NOT NULL,
      plataforma text NOT NULL,
      metrica text NOT NULL,
      valor double precision,
      campanha text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_base_metricas_cliente_data') THEN
    ALTER INDEX public.idx_base_metricas_cliente_data
      RENAME TO idx_base_metricas_make_cliente_data;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_base_metricas_plataforma') THEN
    ALTER INDEX public.idx_base_metricas_plataforma
      RENAME TO idx_base_metricas_make_plataforma;
  END IF;
END $$;

-- ---------- 2. Tabela Hub — layout idêntico ao Make ----------
CREATE TABLE IF NOT EXISTS public.base_metricas_hub (
  LIKE public.base_metricas_make INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING STORAGE
);

-- Garantir colunas se hub foi criada vazia em ambiente sem make ainda
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'base_metricas_hub'
  ) THEN
  NULL;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'base_metricas_hub' AND column_name = 'id'
  ) THEN
    CREATE TABLE public.base_metricas_hub (
      id bigserial PRIMARY KEY,
      data date NOT NULL,
      cliente text NOT NULL,
      plataforma text NOT NULL,
      metrica text NOT NULL,
      valor double precision,
      campanha text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_base_metricas_hub_cliente_data
  ON public.base_metricas_hub (cliente, data);
CREATE INDEX IF NOT EXISTS idx_base_metricas_hub_plataforma
  ON public.base_metricas_hub (plataforma);
CREATE INDEX IF NOT EXISTS idx_base_metricas_hub_cliente_plataforma_data
  ON public.base_metricas_hub (cliente, plataforma, data);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.base_metricas_hub TO service_role;
GRANT SELECT ON public.base_metricas_hub TO authenticated;

ALTER TABLE public.base_metricas_hub ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS base_metricas_hub_admin_select ON public.base_metricas_hub;
CREATE POLICY base_metricas_hub_admin_select ON public.base_metricas_hub
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------- 3. Fonte ativa para vw_metricas (rollback = UPDATE para 'make') ----------
CREATE TABLE IF NOT EXISTS public.ph_metricas_source (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  active_source text NOT NULL DEFAULT 'make'
    CHECK (active_source IN ('make', 'hub')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ph_metricas_source (id, active_source)
VALUES (1, 'make')
ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON public.ph_metricas_source TO authenticated;
GRANT ALL ON public.ph_metricas_source TO service_role;

-- ---------- 4. View de abstração — dashboards leem SOMENTE vw_metricas ----------
CREATE OR REPLACE VIEW public.vw_metricas AS
SELECT m.id, m.data, m.cliente, m.plataforma, m.metrica, m.valor, m.campanha, m.created_at
FROM public.base_metricas_make m
WHERE (SELECT active_source FROM public.ph_metricas_source WHERE id = 1) = 'make'
UNION ALL
SELECT h.id, h.data, h.cliente, h.plataforma, h.metrica, h.valor, h.campanha, h.created_at
FROM public.base_metricas_hub h
WHERE (SELECT active_source FROM public.ph_metricas_source WHERE id = 1) = 'hub';

GRANT SELECT ON public.vw_metricas TO authenticated;
GRANT SELECT ON public.vw_metricas TO service_role;

-- ---------- 5. current_user_clientes — usa make (produção) para catálogo admin ----------
CREATE OR REPLACE FUNCTION public.current_user_clientes()
RETURNS TABLE (cliente_nome text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ca.cliente_nome
  FROM public.client_access ca
  WHERE ca.user_id = auth.uid()
  UNION
  SELECT DISTINCT COALESCE(al.nome_canonico, bm.cliente)
  FROM public.base_metricas_make bm
  LEFT JOIN public.cliente_aliases al ON al.alias_metricas = bm.cliente
  WHERE public.has_role(auth.uid(), 'admin');
$$;

-- ---------- 6. vw_metricas_normalizadas — passa a ler vw_metricas ----------
CREATE OR REPLACE VIEW public.vw_metricas_normalizadas AS
SELECT
  bm.id,
  bm.data,
  COALESCE(al.nome_canonico, bm.cliente) AS cliente,
  CASE lower(bm.plataforma)
    WHEN 'meta ads'           THEN 'meta_ads'
    WHEN 'google ads'         THEN 'google_ads'
    WHEN 'google analytics 4' THEN 'ga4'
    WHEN 'instagram'          THEN 'instagram'
    WHEN 'google business'    THEN 'google_business'
    WHEN 'tiktok'             THEN 'tiktok'
    ELSE lower(replace(bm.plataforma, ' ', '_'))
  END AS plataforma,
  lower(bm.metrica) AS metrica,
  CASE
    WHEN lower(bm.plataforma) = 'google ads' AND lower(bm.metrica) = 'spend'
      THEN bm.valor / 1000000.0
    ELSE bm.valor
  END AS valor,
  bm.campanha,
  bm.created_at
FROM public.vw_metricas bm
LEFT JOIN public.cliente_aliases al ON al.alias_metricas = bm.cliente
WHERE bm.valor IS NOT NULL
  AND COALESCE(al.nome_canonico, bm.cliente)
      IN (SELECT cliente_nome FROM public.current_user_clientes());

GRANT SELECT ON public.vw_metricas_normalizadas TO authenticated;

-- ---------- 7. Guarda DB — Platform Hub não escreve em make ----------
CREATE OR REPLACE FUNCTION public.trg_block_platform_hub_make_writes()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('app.platform_hub_writer', true) = 'true' THEN
    RAISE EXCEPTION 'Platform Hub cannot write to base_metricas_make (production Make data)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_platform_hub_make_writes ON public.base_metricas_make;
CREATE TRIGGER block_platform_hub_make_writes
  BEFORE INSERT OR UPDATE OR DELETE ON public.base_metricas_make
  FOR EACH ROW EXECUTE FUNCTION public.trg_block_platform_hub_make_writes();

-- ---------- 8. ph_comparison_reports — histórico estruturado ----------
DO $$ BEGIN
  ALTER TYPE public.ph_homologation_status ADD VALUE IF NOT EXISTS 'cutover_ready';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN
    CREATE TYPE public.ph_homologation_status AS ENUM (
      'validating', 'blocked', 'ready', 'official_ready',
      'make_active', 'make_disabled', 'cutover_ready'
    );
END $$;

CREATE TABLE IF NOT EXISTS public.ph_comparison_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.ph_connections(id) ON DELETE CASCADE,
  plugin_key TEXT NOT NULL,
  provider_type TEXT NOT NULL DEFAULT 'official_api',
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  baseline_source TEXT NOT NULL DEFAULT 'base_metricas_make',
  candidate_source TEXT NOT NULL DEFAULT 'base_metricas_hub',
  coverage NUMERIC(8, 6),
  matched_metrics INTEGER NOT NULL DEFAULT 0,
  missing_metrics INTEGER NOT NULL DEFAULT 0,
  extra_metrics INTEGER NOT NULL DEFAULT 0,
  value_differences JSONB NOT NULL DEFAULT '[]'::jsonb,
  normalization_differences JSONB NOT NULL DEFAULT '[]'::jsonb,
  rows_make INTEGER NOT NULL DEFAULT 0,
  rows_hub INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  summary TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ph_comparison_reports_connection
  ON public.ph_comparison_reports(connection_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ph_comparison_reports_plugin
  ON public.ph_comparison_reports(plugin_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ph_comparison_reports_status
  ON public.ph_comparison_reports(status);
CREATE INDEX IF NOT EXISTS idx_ph_comparison_reports_coverage
  ON public.ph_comparison_reports(coverage DESC NULLS LAST);

ALTER TABLE public.ph_comparison_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ph_comparison_reports_admin_all ON public.ph_comparison_reports;
CREATE POLICY ph_comparison_reports_admin_all ON public.ph_comparison_reports
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
