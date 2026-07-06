-- =========================================================
-- 19_content_workflow_client_phase2.sql (aditivo, idempotente)
-- Fase 2: evento changes_requested + RLS cliente para aprovação.
-- =========================================================

DO $$ BEGIN
  ALTER TYPE public.content_card_event_type ADD VALUE IF NOT EXISTS 'changes_requested';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Cliente pode inserir eventos de participação (sem alterar o Card).
DROP POLICY IF EXISTS content_card_events_client_insert ON public.content_card_events;
CREATE POLICY content_card_events_client_insert ON public.content_card_events
  FOR INSERT TO authenticated
  WITH CHECK (
    event_type IN ('commented', 'approved', 'changes_requested')
    AND card_id IN (
      SELECT id FROM public.content_cards
      WHERE cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    )
  );
