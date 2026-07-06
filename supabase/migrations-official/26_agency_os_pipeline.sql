-- =========================================================
-- 26_agency_os_pipeline.sql  (aditivo, idempotente)
-- Agency OS Fase 3 — pipeline comercial, leads, inteligência.
-- =========================================================

DO $$ BEGIN
  CREATE TYPE public.agency_pipeline_stage AS ENUM (
    'lead',
    'reuniao',
    'proposta',
    'negociacao',
    'contrato',
    'onboarding',
    'cliente_ativo'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.agency_lead_origem AS ENUM (
    'indicacao',
    'inbound',
    'outbound',
    'site',
    'evento',
    'parceiro',
    'outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- agency_leads ----------

CREATE TABLE IF NOT EXISTS public.agency_leads (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                  text NOT NULL,
  empresa               text,
  origem                public.agency_lead_origem NOT NULL DEFAULT 'outro',
  valor_estimado        numeric(14,2),
  probabilidade_manual    smallint CHECK (probabilidade_manual IS NULL OR probabilidade_manual BETWEEN 0 AND 100),
  probabilidade_score   smallint NOT NULL DEFAULT 30 CHECK (probabilidade_score BETWEEN 0 AND 100),
  proximo_contato       timestamptz,
  proxima_acao          text,
  ultima_interacao      timestamptz,
  responsavel_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  pipeline_stage        public.agency_pipeline_stage NOT NULL DEFAULT 'lead',
  cadastro_cliente_id   bigint REFERENCES public.cadastro_clientes(id) ON DELETE SET NULL,
  kanban_ordem          int NOT NULL DEFAULT 0,
  reunioes_count        int NOT NULL DEFAULT 0,
  interacoes_count      int NOT NULL DEFAULT 0,
  notas                 text,
  created_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  converted_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agency_leads_stage_idx
  ON public.agency_leads (pipeline_stage, kanban_ordem);
CREATE INDEX IF NOT EXISTS agency_leads_cliente_idx
  ON public.agency_leads (cadastro_cliente_id)
  WHERE cadastro_cliente_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS agency_leads_proximo_contato_idx
  ON public.agency_leads (proximo_contato)
  WHERE pipeline_stage NOT IN ('cliente_ativo', 'onboarding');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tg_agency_leads_set_updated_at') THEN
    CREATE TRIGGER tg_agency_leads_set_updated_at
      BEFORE UPDATE ON public.agency_leads
      FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
  END IF;
END $$;

-- Timeline on lead events
CREATE OR REPLACE FUNCTION public.tg_agency_leads_timeline()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.agency_timeline_events (
      cadastro_cliente_id, entity_type, entity_id, event_type, title, payload, actor_user_id
    ) VALUES (
      NEW.cadastro_cliente_id, 'lead', NEW.id::text, 'lead_created',
      'Lead criado: ' || NEW.nome,
      jsonb_build_object('lead_id', NEW.id, 'empresa', NEW.empresa),
      NEW.created_by
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
      INSERT INTO public.agency_timeline_events (
        cadastro_cliente_id, entity_type, entity_id, event_type, title, payload
      ) VALUES (
        NEW.cadastro_cliente_id, 'lead', NEW.id::text,
        CASE WHEN NEW.pipeline_stage = 'cliente_ativo' THEN 'lead_converted' ELSE 'status_changed' END,
        'Lead movido para ' || NEW.pipeline_stage::text,
        jsonb_build_object('from', OLD.pipeline_stage::text, 'to', NEW.pipeline_stage::text)
      );
    END IF;
    IF OLD.cadastro_cliente_id IS NULL AND NEW.cadastro_cliente_id IS NOT NULL THEN
      INSERT INTO public.agency_timeline_events (
        cadastro_cliente_id, entity_type, entity_id, event_type, title, payload
      ) VALUES (
        NEW.cadastro_cliente_id, 'lead', NEW.id::text, 'lead_converted',
        'Lead convertido em cliente',
        jsonb_build_object('lead_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tg_agency_leads_timeline') THEN
    CREATE TRIGGER tg_agency_leads_timeline
      AFTER INSERT OR UPDATE ON public.agency_leads
      FOR EACH ROW EXECUTE FUNCTION public.tg_agency_leads_timeline();
  END IF;
END $$;

-- ---------- Views ----------

DROP VIEW IF EXISTS public.vw_agency_leads_pipeline;

CREATE VIEW public.vw_agency_leads_pipeline
WITH (security_invoker = on) AS
SELECT
  l.*,
  COALESCE(l.probabilidade_manual, l.probabilidade_score) AS probabilidade_efetiva
FROM public.agency_leads l
WHERE l.pipeline_stage != 'cliente_ativo' OR l.cadastro_cliente_id IS NULL;

DROP VIEW IF EXISTS public.vw_agency_executive_summary;

CREATE VIEW public.vw_agency_executive_summary
WITH (security_invoker = on) AS
SELECT
  COALESCE(SUM(cc.valor_mensal) FILTER (
    WHERE cc.ativo AND cc.status_operacional = 'ativo'
  ), 0)::numeric(14,2) AS receita_mensal,
  COUNT(*) FILTER (
    WHERE cc.ativo AND cc.status_operacional = 'ativo'
  )::int AS clientes_ativos,
  COUNT(*) FILTER (
    WHERE cc.ativo AND (
      cc.status_operacional = 'atencao'
      OR (cc.ultimo_contato IS NOT NULL AND cc.ultimo_contato < now() - interval '14 days')
    )
  )::int AS clientes_atencao,
  COUNT(*) FILTER (
    WHERE cc.ativo AND cc.status_operacional = 'implantacao'
  )::int AS clientes_implantacao,
  COUNT(*) FILTER (
    WHERE cc.ativo AND cc.status_operacional = 'negociacao'
  )::int AS leads_negociacao,
  (SELECT count(*)::int FROM public.agency_projects ap
    WHERE ap.status_kanban != 'finalizado') AS projetos_andamento,
  (SELECT count(*)::int FROM public.agency_projects ap
    WHERE ap.status_kanban != 'finalizado'
      AND ap.prazo IS NOT NULL AND ap.prazo < CURRENT_DATE) AS projetos_atrasados,
  0::int AS campanhas_ativas,
  0::int AS campanhas_pausadas,
  (SELECT count(*)::int FROM public.agency_leads al
    WHERE al.pipeline_stage IN ('negociacao', 'proposta')
      AND COALESCE(al.probabilidade_manual, al.probabilidade_score) >= 80) AS leads_quentes
FROM public.cadastro_clientes cc;

-- GRANTs + RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_leads TO authenticated;
GRANT ALL ON public.agency_leads TO service_role;
GRANT SELECT ON public.vw_agency_leads_pipeline TO authenticated;

ALTER TABLE public.agency_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agency_leads_admin_all ON public.agency_leads;
CREATE POLICY agency_leads_admin_all ON public.agency_leads
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
