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
