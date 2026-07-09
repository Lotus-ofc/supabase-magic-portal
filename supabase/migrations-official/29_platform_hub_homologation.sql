-- =========================================================
-- 29_platform_hub_homologation.sql  (aditivo, idempotente)
-- Homologation Mode — reports, debug traces, rollout status
-- Make permanece writer oficial; Hub read-only + comparison
-- =========================================================

DO $$ BEGIN
  CREATE TYPE public.ph_homologation_status AS ENUM (
    'validating',
    'blocked',
    'ready',
    'official_ready',
    'make_active',
    'make_disabled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ph_homologation_report_kind AS ENUM (
    'sync',
    'comparison',
    'coverage',
    'health',
    'provider',
    'dual_run'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.ph_connections
  ADD COLUMN IF NOT EXISTS homologation_status public.ph_homologation_status NOT NULL DEFAULT 'make_active';

ALTER TABLE public.ph_connections
  ADD COLUMN IF NOT EXISTS dual_run_started_at TIMESTAMPTZ;

ALTER TABLE public.ph_connections
  ADD COLUMN IF NOT EXISTS last_comparison_at TIMESTAMPTZ;

ALTER TABLE public.ph_connections
  ADD COLUMN IF NOT EXISTS last_coverage NUMERIC(6, 4);

ALTER TABLE public.ph_connections
  ADD COLUMN IF NOT EXISTS avg_collect_ms INTEGER;

CREATE INDEX IF NOT EXISTS idx_ph_connections_homologation ON public.ph_connections(homologation_status);

CREATE TABLE IF NOT EXISTS public.ph_homologation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.ph_connections(id) ON DELETE CASCADE,
  plugin_key TEXT NOT NULL,
  report_kind public.ph_homologation_report_kind NOT NULL,
  overall TEXT,
  coverage NUMERIC(6, 4),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  duration_ms INTEGER,
  rows_produced INTEGER NOT NULL DEFAULT 0,
  rows_ignored INTEGER NOT NULL DEFAULT 0,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ph_homologation_reports_connection
  ON public.ph_homologation_reports(connection_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ph_debug_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.ph_connections(id) ON DELETE CASCADE,
  plugin_key TEXT NOT NULL,
  operation TEXT NOT NULL,
  request_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  rate_limit JSONB,
  pages_fetched INTEGER NOT NULL DEFAULT 0,
  rows_collected INTEGER NOT NULL DEFAULT 0,
  rows_discarded INTEGER NOT NULL DEFAULT 0,
  retries INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ph_debug_traces_connection
  ON public.ph_debug_traces(connection_id, created_at DESC);

ALTER TABLE public.ph_homologation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_debug_traces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ph_homologation_reports_admin_all ON public.ph_homologation_reports;
CREATE POLICY ph_homologation_reports_admin_all ON public.ph_homologation_reports
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS ph_debug_traces_admin_all ON public.ph_debug_traces;
CREATE POLICY ph_debug_traces_admin_all ON public.ph_debug_traces
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
