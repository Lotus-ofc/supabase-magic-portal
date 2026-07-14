-- =========================================================
-- 31_plano_alinhamento.sql  (aditivo, idempotente)
-- Quiz de alinhamento + proposta comercial do Plano Estratégico.
-- Relação 1:1 — um cadastro_cliente_id = um alinhamento.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.plano_alinhamentos (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_cliente_id  bigint NOT NULL REFERENCES public.cadastro_clientes(id) ON DELETE CASCADE,
  cliente_nome         text NOT NULL,
  quiz_completed_at    timestamptz,
  quiz_data            jsonb,
  has_active_plan      boolean NOT NULL DEFAULT false,
  plan_data            jsonb,
  plan_approved_at     timestamptz,
  plano_id             uuid REFERENCES public.planos_estrategicos(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plano_alinhamentos_cliente_uidx UNIQUE (cadastro_cliente_id)
);

CREATE INDEX IF NOT EXISTS plano_alinhamentos_cliente_nome_idx
  ON public.plano_alinhamentos (cliente_nome);

CREATE INDEX IF NOT EXISTS plano_alinhamentos_plano_idx
  ON public.plano_alinhamentos (plano_id)
  WHERE plano_id IS NOT NULL;

COMMENT ON TABLE public.plano_alinhamentos IS
  'Funil 1:1 do Plano Estratégico: quiz → aguardando proposta → plano ativo.';

GRANT SELECT, INSERT, UPDATE ON public.plano_alinhamentos TO authenticated;
GRANT ALL ON public.plano_alinhamentos TO service_role;

ALTER TABLE public.plano_alinhamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plano_alinhamentos_admin_all ON public.plano_alinhamentos;
CREATE POLICY plano_alinhamentos_admin_all ON public.plano_alinhamentos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS plano_alinhamentos_client_select ON public.plano_alinhamentos;
CREATE POLICY plano_alinhamentos_client_select ON public.plano_alinhamentos
  FOR SELECT TO authenticated
  USING (cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes()));

-- Cliente pode criar/atualizar o quiz; não pode marcar has_active_plan sozinho (admin publica).
DROP POLICY IF EXISTS plano_alinhamentos_client_insert ON public.plano_alinhamentos;
CREATE POLICY plano_alinhamentos_client_insert ON public.plano_alinhamentos
  FOR INSERT TO authenticated
  WITH CHECK (
    cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    AND has_active_plan = false
    AND plan_data IS NULL
  );

DROP POLICY IF EXISTS plano_alinhamentos_client_update_quiz ON public.plano_alinhamentos;
CREATE POLICY plano_alinhamentos_client_update_quiz ON public.plano_alinhamentos
  FOR UPDATE TO authenticated
  USING (
    cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    AND has_active_plan = false
  )
  WITH CHECK (
    cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    AND has_active_plan = false
    AND plan_data IS NULL
  );

-- Aprovação: permitida quando o plano já está ativo (app só grava plan_approved_at).
-- OBS: policies UPDATE não restringem colunas; o trigger abaixo fecha esse buraco.
DROP POLICY IF EXISTS plano_alinhamentos_client_approve ON public.plano_alinhamentos;
CREATE POLICY plano_alinhamentos_client_approve ON public.plano_alinhamentos
  FOR UPDATE TO authenticated
  USING (
    cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    AND has_active_plan = true
    AND plan_data IS NOT NULL
  )
  WITH CHECK (
    cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    AND has_active_plan = true
    AND plan_data IS NOT NULL
  );

-- ---------- Guardas de coluna (1:1 + isolamento de proposta comercial) ----------
-- Cliente autenticado NÃO admin:
--   • nunca altera has_active_plan, plan_data, plano_id, cadastro_cliente_id, cliente_nome
--   • com plano ativo: só pode gravar/alterar plan_approved_at (+ updated_at)
--   • sem plano ativo: pode editar campos do quiz
CREATE OR REPLACE FUNCTION public.plano_alinhamentos_guard_client_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.has_active_plan := false;
    NEW.plan_data := NULL;
    NEW.plan_approved_at := NULL;
    NEW.plano_id := NULL;
    RETURN NEW;
  END IF;

  -- Identidade do registro é imutável para o cliente
  IF NEW.cadastro_cliente_id IS DISTINCT FROM OLD.cadastro_cliente_id
     OR NEW.cliente_nome IS DISTINCT FROM OLD.cliente_nome THEN
    RAISE EXCEPTION 'plano_alinhamentos: identidade do cliente é imutável';
  END IF;

  IF NEW.has_active_plan IS DISTINCT FROM OLD.has_active_plan
     OR NEW.plan_data IS DISTINCT FROM OLD.plan_data
     OR NEW.plano_id IS DISTINCT FROM OLD.plano_id THEN
    RAISE EXCEPTION 'plano_alinhamentos: apenas admin publica/altera a proposta';
  END IF;

  IF OLD.has_active_plan THEN
    -- Aprovação: só plan_approved_at (e updated_at) podem mudar
    IF NEW.quiz_completed_at IS DISTINCT FROM OLD.quiz_completed_at
       OR NEW.quiz_data IS DISTINCT FROM OLD.quiz_data THEN
      RAISE EXCEPTION 'plano_alinhamentos: quiz bloqueado após publicação do plano';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_plano_alinhamentos_guard ON public.plano_alinhamentos;
CREATE TRIGGER trg_plano_alinhamentos_guard
  BEFORE INSERT OR UPDATE ON public.plano_alinhamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.plano_alinhamentos_guard_client_write();

-- ---------- Validação manual (SQL Editor, com JWT de cliente / admin) ----------
-- 1) Estrutura
-- SELECT relrowsecurity FROM pg_class WHERE relname = 'plano_alinhamentos';  -- true
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'plano_alinhamentos';
-- 2) 1:1
-- SELECT indexname FROM pg_indexes WHERE tablename = 'plano_alinhamentos'
--   AND indexdef ILIKE '%UNIQUE%cadastro_cliente_id%';
-- 3) Isolamento (como cliente A): SELECT * FROM plano_alinhamentos;
--    → só linhas cujo cliente_nome está em current_user_clientes()
-- 4) Cliente NÃO publica plano:
--    UPDATE plano_alinhamentos SET has_active_plan = true, plan_data = '{}'::jsonb
--    WHERE cadastro_cliente_id = <seu_id>;  -- deve falhar (policy/trigger)
