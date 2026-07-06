-- =========================================================
-- 24_agency_os_foundation.sql  (aditivo, idempotente)
-- Agency OS — fundação operacional (Fase 1).
-- Estende cadastro_clientes; timeline append-only; tags e notas.
-- NÃO altera base_metricas. NÃO remove colunas existentes.
-- =========================================================

-- ---------- ENUMs ----------

DO $$ BEGIN
  CREATE TYPE public.agency_client_status AS ENUM (
    'ativo',
    'implantacao',
    'negociacao',
    'pausado',
    'atencao'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.agency_priority AS ENUM ('A', 'B', 'C', 'D');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.agency_timeline_event_type AS ENUM (
    'client_created',
    'client_updated',
    'status_changed',
    'note_added',
    'contact_logged',
    'meeting_scheduled',
    'task_created',
    'task_completed',
    'project_created',
    'project_moved',
    'project_completed',
    'lead_created',
    'lead_converted',
    'contract_sent',
    'contract_signed',
    'campaign_created',
    'campaign_paused',
    'payment_received',
    'payment_overdue',
    'report_sent',
    'landing_published'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- cadastro_clientes (colunas operacionais) ----------

ALTER TABLE public.cadastro_clientes
  ADD COLUMN IF NOT EXISTS status_operacional public.agency_client_status NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS prioridade public.agency_priority NOT NULL DEFAULT 'C',
  ADD COLUMN IF NOT EXISTS proxima_acao text,
  ADD COLUMN IF NOT EXISTS responsavel_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ultimo_contato timestamptz,
  ADD COLUMN IF NOT EXISTS proxima_reuniao timestamptz,
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

CREATE INDEX IF NOT EXISTS idx_cadastro_clientes_status_operacional
  ON public.cadastro_clientes (status_operacional)
  WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_cadastro_clientes_prioridade
  ON public.cadastro_clientes (prioridade)
  WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_cadastro_clientes_responsavel
  ON public.cadastro_clientes (responsavel_user_id)
  WHERE responsavel_user_id IS NOT NULL;

-- ---------- agency_tags ----------

CREATE TABLE IF NOT EXISTS public.agency_tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  cor         text NOT NULL DEFAULT '#6366f1',
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agency_tags_nome_key UNIQUE (nome)
);

CREATE TABLE IF NOT EXISTS public.agency_client_tags (
  cadastro_cliente_id bigint NOT NULL REFERENCES public.cadastro_clientes(id) ON DELETE CASCADE,
  tag_id              uuid NOT NULL REFERENCES public.agency_tags(id) ON DELETE CASCADE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cadastro_cliente_id, tag_id)
);

-- ---------- agency_notes ----------

CREATE TABLE IF NOT EXISTS public.agency_notes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_cliente_id bigint NOT NULL REFERENCES public.cadastro_clientes(id) ON DELETE CASCADE,
  body                text NOT NULL,
  author_user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_email        text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agency_notes_cliente_idx
  ON public.agency_notes (cadastro_cliente_id, created_at DESC);

-- ---------- agency_timeline_events (append-only) ----------

CREATE TABLE IF NOT EXISTS public.agency_timeline_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_cliente_id bigint REFERENCES public.cadastro_clientes(id) ON DELETE SET NULL,
  entity_type         text,
  entity_id           text,
  event_type          public.agency_timeline_event_type NOT NULL,
  title               text NOT NULL,
  summary             text,
  payload             jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email         text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agency_timeline_cliente_idx
  ON public.agency_timeline_events (cadastro_cliente_id, created_at DESC);

CREATE INDEX IF NOT EXISTS agency_timeline_created_idx
  ON public.agency_timeline_events (created_at DESC);

-- Immutability guard
CREATE OR REPLACE FUNCTION public.tg_agency_timeline_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'agency_timeline_events is append-only';
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'tg_agency_timeline_no_update'
      AND tgrelid = 'public.agency_timeline_events'::regclass
  ) THEN
    CREATE TRIGGER tg_agency_timeline_no_update
      BEFORE UPDATE OR DELETE ON public.agency_timeline_events
      FOR EACH ROW EXECUTE FUNCTION public.tg_agency_timeline_immutable();
  END IF;
END $$;

-- Auto-timeline on operational status change
CREATE OR REPLACE FUNCTION public.tg_cadastro_clientes_agency_timeline()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.agency_timeline_events (
      cadastro_cliente_id, entity_type, entity_id, event_type, title, payload
    ) VALUES (
      NEW.id, 'client', NEW.id::text, 'client_created',
      'Cliente criado',
      jsonb_build_object('nome_cliente', NEW.nome_cliente)
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status_operacional IS DISTINCT FROM NEW.status_operacional THEN
      INSERT INTO public.agency_timeline_events (
        cadastro_cliente_id, entity_type, entity_id, event_type, title, payload
      ) VALUES (
        NEW.id, 'client', NEW.id::text, 'status_changed',
        'Status alterado para ' || NEW.status_operacional::text,
        jsonb_build_object(
          'from', OLD.status_operacional::text,
          'to', NEW.status_operacional::text
        )
      );
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'tg_cadastro_clientes_agency_timeline'
      AND tgrelid = 'public.cadastro_clientes'::regclass
  ) THEN
    CREATE TRIGGER tg_cadastro_clientes_agency_timeline
      AFTER INSERT OR UPDATE OF status_operacional ON public.cadastro_clientes
      FOR EACH ROW EXECUTE FUNCTION public.tg_cadastro_clientes_agency_timeline();
  END IF;
END $$;

-- Timeline on note insert
CREATE OR REPLACE FUNCTION public.tg_agency_notes_timeline()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.agency_timeline_events (
    cadastro_cliente_id, entity_type, entity_id, event_type, title, summary, payload,
    actor_user_id, actor_email
  ) VALUES (
    NEW.cadastro_cliente_id, 'note', NEW.id::text, 'note_added',
    'Observação adicionada',
    left(NEW.body, 120),
    jsonb_build_object('note_id', NEW.id),
    NEW.author_user_id, NEW.author_email
  );
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'tg_agency_notes_timeline'
      AND tgrelid = 'public.agency_notes'::regclass
  ) THEN
    CREATE TRIGGER tg_agency_notes_timeline
      AFTER INSERT ON public.agency_notes
      FOR EACH ROW EXECUTE FUNCTION public.tg_agency_notes_timeline();
  END IF;
END $$;

-- ---------- Seed serviços padrão ----------

INSERT INTO public.servicos (nome, descricao, ativo)
VALUES
  ('Social Media', 'Gestão de redes sociais', true),
  ('Google Ads', 'Mídia paga Google', true),
  ('Meta Ads', 'Mídia paga Meta', true),
  ('Landing Page', 'Páginas de conversão', true),
  ('Site', 'Desenvolvimento de sites', true),
  ('SEO', 'Otimização orgânica', true),
  ('Consultoria', 'Consultoria estratégica', true),
  ('Automações', 'Automações e integrações', true),
  ('CRM', 'Implementação CRM', true),
  ('Sistema', 'Sistemas sob medida', true),
  ('Outros', 'Outros serviços', true)
ON CONFLICT (nome) DO NOTHING;

-- ---------- Views ----------

DROP VIEW IF EXISTS public.vw_agency_client_cards;

CREATE VIEW public.vw_agency_client_cards
WITH (security_invoker = on) AS
SELECT
  cc.id,
  cc.nome_cliente,
  cc.slug,
  cc.ativo,
  cc.empresa,
  cc.valor_mensal,
  cc.categoria,
  cc.status_operacional,
  cc.prioridade,
  cc.proxima_acao,
  cc.responsavel_user_id,
  cc.ultimo_contato,
  cc.proxima_reuniao,
  cc.observacoes,
  cc.data_inicio,
  cc.avatar_url,
  cc.email_principal,
  cc.telefone,
  cc.created_at,
  cc.updated_at,
  COALESCE((
    SELECT array_agg(s.nome ORDER BY s.nome)
    FROM public.cliente_servicos cs
    JOIN public.servicos s ON s.id = cs.servico_id
    WHERE cs.cadastro_cliente_id = cc.id AND cs.ativo = true
  ), ARRAY[]::text[]) AS servicos,
  COALESCE((
    SELECT array_agg(t.nome ORDER BY t.nome)
    FROM public.agency_client_tags ct
    JOIN public.agency_tags t ON t.id = ct.tag_id
    WHERE ct.cadastro_cliente_id = cc.id
  ), ARRAY[]::text[]) AS tags,
  CASE
    WHEN NOT cc.ativo THEN 'critical'
    WHEN cc.status_operacional = 'atencao' THEN 'critical'
    WHEN cc.status_operacional = 'pausado' THEN 'attention'
    WHEN cc.ultimo_contato IS NOT NULL
      AND cc.ultimo_contato < (now() - interval '14 days') THEN 'attention'
    WHEN cc.status_operacional IN ('implantacao', 'negociacao') THEN 'good'
    ELSE 'excellent'
  END AS health_tier
FROM public.cadastro_clientes cc;

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
  0::int AS projetos_andamento,
  0::int AS projetos_atrasados,
  0::int AS campanhas_ativas,
  0::int AS campanhas_pausadas,
  0::int AS leads_quentes
FROM public.cadastro_clientes cc;

-- ---------- GRANTs + RLS (admin-only) ----------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_tags TO authenticated;
GRANT ALL ON public.agency_tags TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_client_tags TO authenticated;
GRANT ALL ON public.agency_client_tags TO service_role;

GRANT SELECT, INSERT ON public.agency_notes TO authenticated;
GRANT ALL ON public.agency_notes TO service_role;

GRANT SELECT, INSERT ON public.agency_timeline_events TO authenticated;
GRANT ALL ON public.agency_timeline_events TO service_role;

GRANT SELECT ON public.vw_agency_client_cards TO authenticated;
GRANT SELECT ON public.vw_agency_executive_summary TO authenticated;

ALTER TABLE public.agency_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_client_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_timeline_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agency_tags_admin_all ON public.agency_tags;
CREATE POLICY agency_tags_admin_all ON public.agency_tags
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS agency_client_tags_admin_all ON public.agency_client_tags;
CREATE POLICY agency_client_tags_admin_all ON public.agency_client_tags
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS agency_notes_admin_all ON public.agency_notes;
CREATE POLICY agency_notes_admin_all ON public.agency_notes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS agency_timeline_admin_select ON public.agency_timeline_events;
CREATE POLICY agency_timeline_admin_select ON public.agency_timeline_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS agency_timeline_admin_insert ON public.agency_timeline_events;
CREATE POLICY agency_timeline_admin_insert ON public.agency_timeline_events
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
