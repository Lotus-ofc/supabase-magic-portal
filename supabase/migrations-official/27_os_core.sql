-- =========================================================
-- 27_os_core.sql  (aditivo, idempotente)
-- OS Core — auditoria e feature flags.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.core_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action        text NOT NULL,
  module        text NOT NULL,
  entity_type   text,
  entity_id     text,
  actor_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email   text,
  before_state  jsonb,
  after_state   jsonb,
  source        text NOT NULL DEFAULT 'command',
  ip            inet,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS core_audit_log_module_idx
  ON public.core_audit_log (module, created_at DESC);
CREATE INDEX IF NOT EXISTS core_audit_log_entity_idx
  ON public.core_audit_log (entity_type, entity_id)
  WHERE entity_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.core_feature_flags (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key        text NOT NULL,
  status          text NOT NULL CHECK (status IN ('off', 'on', 'beta', 'experimental')),
  scope           text NOT NULL CHECK (scope IN ('global', 'organization', 'user', 'environment')),
  target_id       text,
  description     text,
  module          text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flag_key, scope, target_id)
);

CREATE INDEX IF NOT EXISTS core_feature_flags_key_idx
  ON public.core_feature_flags (flag_key);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tg_core_feature_flags_set_updated_at') THEN
    CREATE TRIGGER tg_core_feature_flags_set_updated_at
      BEFORE UPDATE ON public.core_feature_flags
      FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
  END IF;
END $$;

GRANT SELECT, INSERT ON public.core_audit_log TO authenticated;
GRANT ALL ON public.core_audit_log TO service_role;
GRANT SELECT ON public.core_feature_flags TO authenticated;
GRANT ALL ON public.core_feature_flags TO service_role;

ALTER TABLE public.core_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_audit_log_admin_insert ON public.core_audit_log;
CREATE POLICY core_audit_log_admin_insert ON public.core_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS core_audit_log_admin_select ON public.core_audit_log;
CREATE POLICY core_audit_log_admin_select ON public.core_audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS core_feature_flags_admin_all ON public.core_feature_flags;
CREATE POLICY core_feature_flags_admin_all ON public.core_feature_flags
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
