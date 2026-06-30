-- =========================================================
-- 13_access_management.sql  (aditivo, idempotente)
-- Módulo Auth + Gestão de Acessos Lots BI v2.1
-- lifecycle de negócio, auditoria operacional, system_metadata
-- =========================================================

-- ---------- enum lifecycle ----------
DO $$ BEGIN
  CREATE TYPE public.access_lifecycle_status AS ENUM (
    'invite_pending',
    'awaiting_password',
    'invite_expired',
    'active',
    'revoked',
    'disabled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- access_accounts (somente regras de negócio) ----------
CREATE TABLE IF NOT EXISTS public.access_accounts (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lifecycle_status public.access_lifecycle_status NOT NULL DEFAULT 'invite_pending',
  blocked_reason   text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_accounts_lifecycle
  ON public.access_accounts (lifecycle_status);

GRANT SELECT ON public.access_accounts TO authenticated;
GRANT ALL ON public.access_accounts TO service_role;

ALTER TABLE public.access_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "access_accounts_select_own" ON public.access_accounts;
CREATE POLICY "access_accounts_select_own" ON public.access_accounts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "access_accounts_admin_all" ON public.access_accounts;
CREATE POLICY "access_accounts_admin_all" ON public.access_accounts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- access_audit_log (append-only operacional) ----------
CREATE TABLE IF NOT EXISTS public.access_audit_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action     text NOT NULL,
  detail     text,
  metadata   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_audit_user_created
  ON public.access_audit_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_access_audit_action_created
  ON public.access_audit_log (action, created_at DESC);

GRANT SELECT ON public.access_audit_log TO authenticated;
GRANT ALL ON public.access_audit_log TO service_role;

ALTER TABLE public.access_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "access_audit_admin_select" ON public.access_audit_log;
CREATE POLICY "access_audit_admin_select" ON public.access_audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------- system_metadata (versionamento de módulos) ----------
CREATE TABLE IF NOT EXISTS public.system_metadata (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.system_metadata TO authenticated;
GRANT ALL ON public.system_metadata TO service_role;

ALTER TABLE public.system_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_metadata_admin_select" ON public.system_metadata;
CREATE POLICY "system_metadata_admin_select" ON public.system_metadata
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.system_metadata (key, value, updated_at)
VALUES ('AUTH_MODULE_VERSION', '2.1', now())
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;

-- ---------- sync access_accounts on new auth user ----------
CREATE OR REPLACE FUNCTION public.ensure_access_account_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.access_accounts (user_id, lifecycle_status)
  VALUES (NEW.id, 'invite_pending')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_access_account'
      AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_access_account
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.ensure_access_account_for_user();
  END IF;
END $$;

-- ---------- backfill usuários existentes (zero-downtime, idempotente) ----------
INSERT INTO public.access_accounts (user_id, lifecycle_status)
SELECT
  u.id,
  CASE
    WHEN u.banned_until IS NOT NULL AND u.banned_until > now() THEN
      'revoked'::public.access_lifecycle_status
    WHEN coalesce(u.raw_user_meta_data->'lots_bi'->>'onboarding_completed_at', '') <> '' THEN
      'active'::public.access_lifecycle_status
    WHEN u.last_sign_in_at IS NOT NULL
      AND coalesce(u.raw_user_meta_data->'lots_bi'->>'password_set_at', '') = '' THEN
      'awaiting_password'::public.access_lifecycle_status
    WHEN u.invited_at IS NOT NULL AND u.last_sign_in_at IS NULL THEN
      'invite_pending'::public.access_lifecycle_status
    WHEN u.last_sign_in_at IS NOT NULL THEN
      'active'::public.access_lifecycle_status
    ELSE
      'invite_pending'::public.access_lifecycle_status
  END
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

-- ---------- validação ----------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'access_accounts'
  ) THEN
    RAISE EXCEPTION '13_access_management: access_accounts missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.system_metadata WHERE key = 'AUTH_MODULE_VERSION'
  ) THEN
    RAISE EXCEPTION '13_access_management: AUTH_MODULE_VERSION missing';
  END IF;
END $$;
