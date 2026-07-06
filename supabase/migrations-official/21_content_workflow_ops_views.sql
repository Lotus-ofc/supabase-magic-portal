-- =========================================================
-- 21_content_workflow_ops_views.sql (aditivo, idempotente)
-- Fase 4: índices de busca Biblioteca + view ops + hard delete guard reforçado.
-- =========================================================

CREATE INDEX IF NOT EXISTS content_cards_library_search_idx
  ON public.content_cards (cadastro_cliente_id, plataforma, formato, status, published_at DESC NULLS LAST)
  WHERE status IN ('publicado', 'arquivado') AND published_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS content_cards_ops_overdue_idx
  ON public.content_cards (data_publicacao, status)
  WHERE status NOT IN ('publicado', 'arquivado');

CREATE INDEX IF NOT EXISTS content_cards_responsavel_idx
  ON public.content_cards (responsavel_email)
  WHERE responsavel_email IS NOT NULL;

DROP VIEW IF EXISTS public.vw_content_workflow_library;
CREATE VIEW public.vw_content_workflow_library AS
SELECT *
FROM public.content_cards
WHERE status IN ('publicado', 'arquivado')
  AND published_at IS NOT NULL;

GRANT SELECT ON public.vw_content_workflow_library TO authenticated;
GRANT SELECT ON public.vw_content_workflow_library TO service_role;

DROP VIEW IF EXISTS public.vw_content_workflow_ops_status;
CREATE VIEW public.vw_content_workflow_ops_status AS
SELECT
  cadastro_cliente_id,
  cliente_nome,
  responsavel_email,
  status,
  COUNT(*)::bigint AS card_count
FROM public.content_cards
GROUP BY cadastro_cliente_id, cliente_nome, responsavel_email, status;

GRANT SELECT ON public.vw_content_workflow_ops_status TO authenticated;
GRANT SELECT ON public.vw_content_workflow_ops_status TO service_role;
