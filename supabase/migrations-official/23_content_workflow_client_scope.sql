-- =========================================================
-- 23_content_workflow_client_scope.sql (aditivo, idempotente)
-- Corrige projeção do Portal do Cliente: escopo por cadastro_cliente_id
-- (alinhado ao admin), não apenas por cliente_nome em string.
-- =========================================================

-- Backfill cadastro_cliente_id em client_access quando ausente
UPDATE public.client_access ca
SET cadastro_cliente_id = cc.id
FROM public.cadastro_clientes cc
WHERE ca.cadastro_cliente_id IS NULL
  AND cc.nome_cliente = ca.cliente_nome;

-- IDs de cadastro vinculados ao usuário autenticado (client_access)
CREATE OR REPLACE FUNCTION public.current_user_cadastro_cliente_ids()
RETURNS SETOF bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT COALESCE(ca.cadastro_cliente_id, cc.id)
  FROM public.client_access ca
  LEFT JOIN public.cadastro_clientes cc ON cc.nome_cliente = ca.cliente_nome
  WHERE ca.user_id = auth.uid()
    AND COALESCE(ca.cadastro_cliente_id, cc.id) IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_cadastro_cliente_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_cadastro_cliente_ids() TO service_role;

-- ---------- content_cards: escopo por ID ----------
DROP POLICY IF EXISTS content_cards_client_select ON public.content_cards;
CREATE POLICY content_cards_client_select ON public.content_cards
  FOR SELECT TO authenticated
  USING (
    cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids())
    OR cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
  );

DROP POLICY IF EXISTS content_cards_client_update ON public.content_cards;
CREATE POLICY content_cards_client_update ON public.content_cards
  FOR UPDATE TO authenticated
  USING (
    cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids())
    OR cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
  )
  WITH CHECK (
    cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids())
    OR cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
  );

-- ---------- content_card_events ----------
DROP POLICY IF EXISTS content_card_events_client_select ON public.content_card_events;
CREATE POLICY content_card_events_client_select ON public.content_card_events
  FOR SELECT TO authenticated
  USING (
    card_id IN (
      SELECT id FROM public.content_cards
      WHERE cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids())
         OR cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    )
  );

DROP POLICY IF EXISTS content_card_events_client_insert ON public.content_card_events;
CREATE POLICY content_card_events_client_insert ON public.content_card_events
  FOR INSERT TO authenticated
  WITH CHECK (
    event_type IN ('commented', 'approved', 'changes_requested')
    AND card_id IN (
      SELECT id FROM public.content_cards
      WHERE cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids())
         OR cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    )
  );

-- ---------- content_card_attachments ----------
DROP POLICY IF EXISTS content_card_attachments_client_select ON public.content_card_attachments;
CREATE POLICY content_card_attachments_client_select ON public.content_card_attachments
  FOR SELECT TO authenticated
  USING (
    card_id IN (
      SELECT id FROM public.content_cards
      WHERE cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids())
         OR cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    )
  );

-- ---------- editorial_pillars ----------
DROP POLICY IF EXISTS editorial_pillars_client_select ON public.editorial_pillars;
CREATE POLICY editorial_pillars_client_select ON public.editorial_pillars
  FOR SELECT TO authenticated
  USING (
    cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids())
  );

-- ---------- story_plan_rows ----------
DROP POLICY IF EXISTS story_plan_rows_client_select ON public.story_plan_rows;
CREATE POLICY story_plan_rows_client_select ON public.story_plan_rows
  FOR SELECT TO authenticated
  USING (
    cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids())
  );
