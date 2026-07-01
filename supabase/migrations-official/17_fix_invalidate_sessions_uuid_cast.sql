-- =========================================================
-- 17_fix_invalidate_sessions_uuid_cast.sql  (aditivo, idempotente)
-- Corrige: operator does not exist: character varying = uuid
-- em auth.refresh_tokens (user_id varchar) vs parâmetro uuid.
-- =========================================================

CREATE OR REPLACE FUNCTION public.access_invalidate_auth_sessions(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'user_id required';
  END IF;

  DELETE FROM auth.refresh_tokens WHERE user_id = _user_id::text;
  DELETE FROM auth.sessions WHERE user_id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.access_invalidate_auth_sessions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.access_invalidate_auth_sessions(uuid) TO service_role;
