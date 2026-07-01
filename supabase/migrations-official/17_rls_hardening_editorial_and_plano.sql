-- =========================================================
-- 17_rls_hardening_editorial_and_plano.sql
--
-- Fixes:
--   1) editorial_rls_bypass — posts_editorial: RLS previously allowed clients
--      to update any column via direct REST calls, bypassing the approval
--      workflow enforced only in the server function.
--   2) strategic_plan_client_rls — strategic-plan child tables had FOR ALL
--      client policies, letting authenticated clients INSERT/UPDATE/DELETE
--      via direct REST calls even though server fns require admin.
--
-- Approach:
--   - Editorial: keep client UPDATE via RLS but add a BEFORE UPDATE trigger
--     that, for non-admins, forbids changing any column other than `status`
--     and restricts the target status to approval-workflow transitions.
--   - Strategic plans: replace `_client_all` (FOR ALL) child-table policies
--     and the `_client_write` policy on planos_estrategicos with SELECT-only
--     policies. Admins keep full access via `_admin_all`; server fns already
--     assertAdmin before writing.
-- =========================================================

-- ---------- 1) posts_editorial: column/transition guard ----------

CREATE OR REPLACE FUNCTION public.tg_posts_editorial_client_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  is_admin := public.has_role(auth.uid(), 'admin');
  IF is_admin THEN
    RETURN NEW;
  END IF;

  -- Non-admins may only change the `status` column.
  IF NEW.cliente_nome     IS DISTINCT FROM OLD.cliente_nome
  OR NEW.cadastro_cliente_id IS DISTINCT FROM OLD.cadastro_cliente_id
  OR NEW.plataforma       IS DISTINCT FROM OLD.plataforma
  OR NEW.titulo           IS DISTINCT FROM OLD.titulo
  OR NEW.legenda          IS DISTINCT FROM OLD.legenda
  OR NEW.capa_url         IS DISTINCT FROM OLD.capa_url
  OR NEW.data_publicacao  IS DISTINCT FROM OLD.data_publicacao
  OR NEW.created_by       IS DISTINCT FROM OLD.created_by
  OR NEW.created_at       IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Clientes só podem alterar o status do post via fluxo de aprovação.'
      USING ERRCODE = '42501';
  END IF;

  -- Non-admins may only transition status within the approval workflow.
  -- Allowed: aguardando_aprovacao -> aprovado | em_producao
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status <> 'aguardando_aprovacao'
    OR NEW.status NOT IN ('aprovado', 'em_producao') THEN
      RAISE EXCEPTION 'Transição de status não permitida para clientes (% -> %).',
        OLD.status, NEW.status
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_editorial_client_guard ON public.posts_editorial;
CREATE TRIGGER posts_editorial_client_guard
  BEFORE UPDATE ON public.posts_editorial
  FOR EACH ROW EXECUTE FUNCTION public.tg_posts_editorial_client_guard();

-- Block direct client INSERT/DELETE (server fn uses admin path or admin RLS).
-- We keep posts_client_select and posts_client_update from 06_editorial.sql.
-- No FOR INSERT / FOR DELETE client policy exists — leaving RLS default deny.

-- ---------- 2) planos_estrategicos: client SELECT-only ----------

DROP POLICY IF EXISTS planos_estrategicos_client_write ON public.planos_estrategicos;
-- planos_estrategicos_client_select already exists (SELECT only).

-- ---------- 3) plano_* child tables: client SELECT-only ----------

DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'plano_objetivos', 'plano_estrategias', 'plano_metric_refs',
    'plano_hipoteses', 'plano_oportunidades', 'plano_decisoes',
    'plano_aprendizados', 'plano_roadmap_marcos', 'plano_acoes',
    'plano_eventos', 'plano_snapshots'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_client_all ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I_client_select ON public.%I
         FOR SELECT TO authenticated
         USING (
           plano_id IN (
             SELECT id FROM public.planos_estrategicos
             WHERE cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
           )
         )',
      tbl, tbl
    );
  END LOOP;
END $$;

-- Junction table: via objetivo
DROP POLICY IF EXISTS plano_objetivo_estrategias_client_all ON public.plano_objetivo_estrategias;
CREATE POLICY plano_objetivo_estrategias_client_select ON public.plano_objetivo_estrategias
  FOR SELECT TO authenticated
  USING (
    objetivo_id IN (
      SELECT o.id FROM public.plano_objetivos o
      JOIN public.planos_estrategicos p ON p.id = o.plano_id
      WHERE p.cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    )
  );

-- =========================================================
-- Notes:
-- * Admin writes on all plano_* tables continue via `_admin_all` policies.
-- * Server functions that require admin (assertAdmin) will now also fail
--   at RLS if invoked by a non-admin — defense in depth.
-- =========================================================
