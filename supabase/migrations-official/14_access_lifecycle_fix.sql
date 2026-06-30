-- =========================================================
-- 14_access_lifecycle_fix.sql  (aditivo, idempotente)
-- Corrige backfill da migration 13 que marcava active sem onboarding
-- =========================================================

UPDATE public.access_accounts aa
SET
  lifecycle_status = CASE
    WHEN coalesce(u.raw_user_meta_data->'lots_bi'->>'password_set_at', '') = '' THEN
      'invite_pending'::public.access_lifecycle_status
    ELSE
      'awaiting_password'::public.access_lifecycle_status
  END,
  updated_at = now()
FROM auth.users u
WHERE aa.user_id = u.id
  AND aa.lifecycle_status = 'active'::public.access_lifecycle_status
  AND coalesce(u.raw_user_meta_data->'lots_bi'->>'onboarding_completed_at', '') = '';
