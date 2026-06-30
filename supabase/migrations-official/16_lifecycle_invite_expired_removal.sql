-- Migra lifecycle legado invite_expired → invite_pending (contrato Fase 1).
UPDATE public.access_accounts
SET lifecycle_status = 'invite_pending',
    updated_at = now()
WHERE lifecycle_status = 'invite_expired';
