-- =========================================================
-- 22_content_workflow_legacy_deprecation.sql  (aditivo, idempotente)
-- Content Workflow v3 — Fase 5: descontinuação definitiva do editorial legado.
-- =========================================================

-- ---------- View stats: content_cards (substitui posts_editorial) ----------
CREATE OR REPLACE VIEW public.vw_estrategia_editorial_stats AS
SELECT
  c.estrategia_id,
  c.status::text AS status,
  count(*)::bigint AS total
FROM public.content_cards c
WHERE c.estrategia_id IS NOT NULL
  AND c.status <> 'arquivado'
GROUP BY c.estrategia_id, c.status;

GRANT SELECT ON public.vw_estrategia_editorial_stats TO authenticated;
GRANT SELECT ON public.vw_estrategia_editorial_stats TO service_role;

-- ---------- Remover guard legado ----------
DROP TRIGGER IF EXISTS posts_editorial_client_guard ON public.posts_editorial;
DROP FUNCTION IF EXISTS public.tg_posts_editorial_client_guard();

-- ---------- Remover tabelas legado (ordem por FK) ----------
DROP TABLE IF EXISTS public.post_snapshots CASCADE;
DROP TABLE IF EXISTS public.post_revisions CASCADE;
DROP TABLE IF EXISTS public.post_media CASCADE;
DROP TABLE IF EXISTS public.posts_editorial CASCADE;

-- ---------- Funções de mapeamento legado (backfill migration 18) ----------
DROP FUNCTION IF EXISTS public.map_legacy_post_status_to_content(public.post_status);
DROP FUNCTION IF EXISTS public.map_legacy_revision_tipo_to_event(public.post_revision_tipo);
