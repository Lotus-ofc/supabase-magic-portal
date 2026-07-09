-- =========================================================
-- 28_platform_hub.sql  (aditivo, idempotente)
-- Platform Hub — persistência operacional (ph_*)
-- NÃO altera base_metricas. Admin UI + OAuth + timeline.
-- =========================================================

DO $$ BEGIN
  CREATE TYPE public.ph_connection_status AS ENUM ('active', 'disabled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ph_migration_stage AS ENUM (
    'make_passive',
    'parity',
    'dual_run',
    'ready',
    'official_only',
    'make_off'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ph_health_status AS ENUM ('healthy', 'degraded', 'unhealthy', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ph_timeline_event_kind AS ENUM (
    'connection_created',
    'connection_updated',
    'provider_changed',
    'oauth_completed',
    'oauth_failed',
    'credential_updated',
    'identity_attached',
    'sync_started',
    'sync_finished',
    'sync_failed',
    'health_changed',
    'migration_stage_changed',
    'diagnostic_run',
    'reconnect',
    'connection_disabled',
    'connection_deleted'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.ph_connections (
  id UUID PRIMARY KEY,
  plugin_key TEXT NOT NULL,
  label TEXT NOT NULL,
  scope_ref TEXT NOT NULL,
  cadastro_id INTEGER REFERENCES public.cadastro_clientes(id) ON DELETE SET NULL,
  capability TEXT NOT NULL,
  active_provider_type TEXT NOT NULL,
  status public.ph_connection_status NOT NULL DEFAULT 'active',
  migration_stage public.ph_migration_stage NOT NULL DEFAULT 'make_passive',
  health_status public.ph_health_status NOT NULL DEFAULT 'unknown',
  health_score INTEGER,
  api_version TEXT,
  coverage NUMERIC(6, 4),
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_error TEXT,
  metrics_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ph_connections_cadastro ON public.ph_connections(cadastro_id);
CREATE INDEX IF NOT EXISTS idx_ph_connections_plugin ON public.ph_connections(plugin_key);
CREATE INDEX IF NOT EXISTS idx_ph_connections_status ON public.ph_connections(status);

CREATE TABLE IF NOT EXISTS public.ph_identities (
  id UUID PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.ph_connections(id) ON DELETE CASCADE,
  identity_type TEXT NOT NULL,
  external_id TEXT NOT NULL,
  label TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (connection_id, identity_type, external_id)
);

CREATE INDEX IF NOT EXISTS idx_ph_identities_connection ON public.ph_identities(connection_id);

CREATE TABLE IF NOT EXISTS public.ph_credentials (
  connection_id UUID NOT NULL REFERENCES public.ph_connections(id) ON DELETE CASCADE,
  credential_key TEXT NOT NULL,
  payload_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (connection_id, credential_key)
);

CREATE TABLE IF NOT EXISTS public.ph_sync_runs (
  id UUID PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.ph_connections(id) ON DELETE CASCADE,
  execution_id UUID NOT NULL,
  provider_type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  rows_collected INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ph_sync_runs_connection ON public.ph_sync_runs(connection_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.ph_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES public.ph_connections(id) ON DELETE CASCADE,
  cadastro_id INTEGER REFERENCES public.cadastro_clientes(id) ON DELETE SET NULL,
  kind public.ph_timeline_event_kind NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ph_timeline_connection ON public.ph_timeline_events(connection_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ph_timeline_cadastro ON public.ph_timeline_events(cadastro_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ph_oauth_states (
  state TEXT PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.ph_connections(id) ON DELETE CASCADE,
  plugin_key TEXT NOT NULL,
  redirect_after TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ph_oauth_states_expires ON public.ph_oauth_states(expires_at);

ALTER TABLE public.ph_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_oauth_states ENABLE ROW LEVEL SECURITY;

-- RLS: admins autenticados (service-role continua bypass)
DROP POLICY IF EXISTS ph_connections_admin_all ON public.ph_connections;
CREATE POLICY ph_connections_admin_all ON public.ph_connections
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS ph_identities_admin_all ON public.ph_identities;
CREATE POLICY ph_identities_admin_all ON public.ph_identities
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS ph_credentials_admin_all ON public.ph_credentials;
CREATE POLICY ph_credentials_admin_all ON public.ph_credentials
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS ph_sync_runs_admin_all ON public.ph_sync_runs;
CREATE POLICY ph_sync_runs_admin_all ON public.ph_sync_runs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS ph_timeline_admin_all ON public.ph_timeline_events;
CREATE POLICY ph_timeline_admin_all ON public.ph_timeline_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS ph_oauth_states_admin_all ON public.ph_oauth_states;
CREATE POLICY ph_oauth_states_admin_all ON public.ph_oauth_states
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_ph_connections_health ON public.ph_connections(health_status);
CREATE INDEX IF NOT EXISTS idx_ph_connections_migration ON public.ph_connections(migration_stage);
CREATE INDEX IF NOT EXISTS idx_ph_connections_provider ON public.ph_connections(active_provider_type);
