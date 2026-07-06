-- =========================================================
-- 25_agency_os_operations.sql  (aditivo, idempotente)
-- Agency OS Fase 2 — tarefas, projetos, motor operacional.
-- =========================================================

DO $$ BEGIN
  CREATE TYPE public.agency_project_type AS ENUM (
    'landing', 'site', 'sistema', 'automacao', 'seo', 'design', 'outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.agency_project_status AS ENUM (
    'producao', 'revisao', 'finalizado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.agency_task_status AS ENUM (
    'open', 'completed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- agency_tasks ----------

CREATE TABLE IF NOT EXISTS public.agency_tasks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_cliente_id bigint NOT NULL REFERENCES public.cadastro_clientes(id) ON DELETE CASCADE,
  titulo              text NOT NULL,
  descricao           text,
  prioridade          public.agency_priority NOT NULL DEFAULT 'C',
  due_at              timestamptz,
  agenda_date         date,
  responsavel_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status              public.agency_task_status NOT NULL DEFAULT 'open',
  completed_at        timestamptz,
  completed_on_date   date,
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agency_tasks_cliente_idx
  ON public.agency_tasks (cadastro_cliente_id, status);
CREATE INDEX IF NOT EXISTS agency_tasks_agenda_idx
  ON public.agency_tasks (agenda_date, status)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS agency_tasks_due_idx
  ON public.agency_tasks (due_at)
  WHERE status = 'open';

-- ---------- agency_projects ----------

CREATE TABLE IF NOT EXISTS public.agency_projects (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_cliente_id bigint NOT NULL REFERENCES public.cadastro_clientes(id) ON DELETE CASCADE,
  titulo              text NOT NULL,
  tipo                public.agency_project_type NOT NULL DEFAULT 'outro',
  status_kanban       public.agency_project_status NOT NULL DEFAULT 'producao',
  prioridade          public.agency_priority NOT NULL DEFAULT 'C',
  etiqueta            text,
  prazo               date,
  responsavel_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  checklist           jsonb NOT NULL DEFAULT '[]'::jsonb,
  kanban_ordem        int NOT NULL DEFAULT 0,
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agency_projects_checklist_is_array
    CHECK (jsonb_typeof(checklist) = 'array')
);

CREATE INDEX IF NOT EXISTS agency_projects_kanban_idx
  ON public.agency_projects (status_kanban, kanban_ordem);
CREATE INDEX IF NOT EXISTS agency_projects_cliente_idx
  ON public.agency_projects (cadastro_cliente_id, status_kanban);
CREATE INDEX IF NOT EXISTS agency_projects_prazo_idx
  ON public.agency_projects (prazo)
  WHERE status_kanban != 'finalizado';

-- updated_at triggers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tg_agency_tasks_set_updated_at'
  ) THEN
    CREATE TRIGGER tg_agency_tasks_set_updated_at
      BEFORE UPDATE ON public.agency_tasks
      FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tg_agency_projects_set_updated_at'
  ) THEN
    CREATE TRIGGER tg_agency_projects_set_updated_at
      BEFORE UPDATE ON public.agency_projects
      FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
  END IF;
END $$;

-- Timeline triggers
CREATE OR REPLACE FUNCTION public.tg_agency_tasks_timeline()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.agency_timeline_events (
      cadastro_cliente_id, entity_type, entity_id, event_type, title, payload, actor_user_id
    ) VALUES (
      NEW.cadastro_cliente_id, 'task', NEW.id::text, 'task_created',
      'Tarefa criada: ' || NEW.titulo,
      jsonb_build_object('task_id', NEW.id, 'titulo', NEW.titulo),
      NEW.created_by
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
    INSERT INTO public.agency_timeline_events (
      cadastro_cliente_id, entity_type, entity_id, event_type, title, payload
    ) VALUES (
      NEW.cadastro_cliente_id, 'task', NEW.id::text, 'task_completed',
      'Tarefa concluída: ' || NEW.titulo,
      jsonb_build_object('task_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_agency_projects_timeline()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.agency_timeline_events (
      cadastro_cliente_id, entity_type, entity_id, event_type, title, payload, actor_user_id
    ) VALUES (
      NEW.cadastro_cliente_id, 'project', NEW.id::text, 'project_created',
      'Projeto iniciado: ' || NEW.titulo,
      jsonb_build_object('project_id', NEW.id, 'tipo', NEW.tipo::text),
      NEW.created_by
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status_kanban IS DISTINCT FROM NEW.status_kanban THEN
    INSERT INTO public.agency_timeline_events (
      cadastro_cliente_id, entity_type, entity_id, event_type, title, payload
    ) VALUES (
      NEW.cadastro_cliente_id, 'project', NEW.id::text, 'project_moved',
      'Projeto movido para ' || NEW.status_kanban::text,
      jsonb_build_object('from', OLD.status_kanban::text, 'to', NEW.status_kanban::text)
    );
    IF NEW.status_kanban = 'finalizado' THEN
      INSERT INTO public.agency_timeline_events (
        cadastro_cliente_id, entity_type, entity_id, event_type, title, payload
      ) VALUES (
        NEW.cadastro_cliente_id, 'project', NEW.id::text, 'project_completed',
        'Projeto finalizado: ' || NEW.titulo,
        jsonb_build_object('project_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tg_agency_tasks_timeline') THEN
    CREATE TRIGGER tg_agency_tasks_timeline
      AFTER INSERT OR UPDATE OF status ON public.agency_tasks
      FOR EACH ROW EXECUTE FUNCTION public.tg_agency_tasks_timeline();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tg_agency_projects_timeline') THEN
    CREATE TRIGGER tg_agency_projects_timeline
      AFTER INSERT OR UPDATE OF status_kanban ON public.agency_projects
      FOR EACH ROW EXECUTE FUNCTION public.tg_agency_projects_timeline();
  END IF;
END $$;

-- Update executive summary view
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
  0::int AS leads_quentes
FROM public.cadastro_clientes cc;

-- GRANTs + RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_tasks TO authenticated;
GRANT ALL ON public.agency_tasks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_projects TO authenticated;
GRANT ALL ON public.agency_projects TO service_role;

ALTER TABLE public.agency_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agency_tasks_admin_all ON public.agency_tasks;
CREATE POLICY agency_tasks_admin_all ON public.agency_tasks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS agency_projects_admin_all ON public.agency_projects;
CREATE POLICY agency_projects_admin_all ON public.agency_projects
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
