-- =========================================================
-- 15_auth_invalidate_sessions.sql  (aditivo, idempotente)
-- Revoga sessões Auth por user_id via service role.
-- GoTrue admin.signOut() exige JWT do usuário (não UUID).
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

  DELETE FROM auth.refresh_tokens WHERE user_id = _user_id;
  DELETE FROM auth.sessions WHERE user_id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.access_invalidate_auth_sessions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.access_invalidate_auth_sessions(uuid) TO service_role;
