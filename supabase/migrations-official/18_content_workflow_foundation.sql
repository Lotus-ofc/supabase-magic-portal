-- =========================================================
-- 18_content_workflow_foundation.sql  (aditivo, idempotente)
-- Content Workflow Module v1 — infraestrutura definitiva.
-- Domínio oficial: content_cards (aggregate root).
-- Legado: posts_editorial (backfill source; deprecado na app layer).
-- =========================================================

-- ---------- ENUMs ----------

DO $$ BEGIN
  CREATE TYPE public.content_card_status AS ENUM (
    'producao',
    'edicao',
    'aguardando_aprovacao',
    'aprovado',
    'publicado',
    'arquivado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.content_card_event_type AS ENUM (
    'created',
    'updated',
    'commented',
    'moved',
    'approval_requested',
    'approved',
    'rejected',
    'published',
    'archived',
    'attachment_added',
    'attachment_removed',
    'checklist_changed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.map_legacy_post_status_to_content(s public.post_status)
RETURNS public.content_card_status
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE s
    WHEN 'rascunho' THEN 'producao'::public.content_card_status
    WHEN 'em_producao' THEN 'producao'::public.content_card_status
    WHEN 'aguardando_aprovacao' THEN 'aguardando_aprovacao'::public.content_card_status
    WHEN 'aprovado' THEN 'aprovado'::public.content_card_status
    WHEN 'publicado' THEN 'publicado'::public.content_card_status
    ELSE 'producao'::public.content_card_status
  END;
$$;

CREATE OR REPLACE FUNCTION public.map_legacy_revision_tipo_to_event(t public.post_revision_tipo)
RETURNS public.content_card_event_type
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE t
    WHEN 'comentario' THEN 'commented'::public.content_card_event_type
    WHEN 'solicitacao_alteracao' THEN 'commented'::public.content_card_event_type
    WHEN 'aprovacao' THEN 'approved'::public.content_card_event_type
    WHEN 'reprovacao' THEN 'rejected'::public.content_card_event_type
    WHEN 'mudanca_status' THEN 'moved'::public.content_card_event_type
    ELSE 'updated'::public.content_card_event_type
  END;
$$;

-- ---------- editorial_pillars (before content_cards.pilar_id FK) ----------

CREATE TABLE IF NOT EXISTS public.editorial_pillars (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_cliente_id bigint NOT NULL REFERENCES public.cadastro_clientes(id) ON DELETE CASCADE,
  titulo              text NOT NULL,
  objetivo            text,
  explicacao          text,
  cor                 text NOT NULL DEFAULT '#6366f1',
  ordem               int NOT NULL DEFAULT 0,
  ativo               boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS editorial_pillars_cliente_ordem_idx
  ON public.editorial_pillars (cadastro_cliente_id, ordem);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.editorial_pillars TO authenticated;
GRANT ALL ON public.editorial_pillars TO service_role;

ALTER TABLE public.editorial_pillars ENABLE ROW LEVEL SECURITY;

-- ---------- content_cards (aggregate root) ----------

CREATE TABLE IF NOT EXISTS public.content_cards (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_cliente_id  bigint NOT NULL REFERENCES public.cadastro_clientes(id) ON DELETE RESTRICT,
  cliente_nome         text NOT NULL,
  data_publicacao      date NOT NULL,
  hora_publicacao      time,
  titulo               text NOT NULL,
  legenda              text,
  copy_text            text,
  roteiro              text,
  direcao_arte         text,
  cta                  text,
  plataforma           text NOT NULL DEFAULT 'instagram',
  formato              text,
  capa_url             text,
  status               public.content_card_status NOT NULL DEFAULT 'producao',
  checklist            jsonb NOT NULL DEFAULT '[]'::jsonb,
  localizacao          text,
  tags                 text[] DEFAULT '{}',
  observacoes          text,
  responsavel_email    text,
  responsavel_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  pilar_id             uuid,
  estrategia_id        uuid REFERENCES public.plano_estrategias(id) ON DELETE SET NULL,
  kanban_ordem         int NOT NULL DEFAULT 0,
  published_at         timestamptz,
  archived_at          timestamptz,
  ai_metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  integration_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  legacy_post_id       uuid,
  created_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_cards_checklist_is_array
    CHECK (jsonb_typeof(checklist) = 'array')
);

DO $$ BEGIN
  ALTER TABLE public.content_cards
    ADD CONSTRAINT content_cards_pilar_id_fkey
    FOREIGN KEY (pilar_id) REFERENCES public.editorial_pillars(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS content_cards_cliente_data_idx
  ON public.content_cards (cadastro_cliente_id, data_publicacao);
CREATE INDEX IF NOT EXISTS content_cards_status_idx
  ON public.content_cards (status);
CREATE INDEX IF NOT EXISTS content_cards_kanban_idx
  ON public.content_cards (cadastro_cliente_id, status, kanban_ordem);
CREATE INDEX IF NOT EXISTS content_cards_library_idx
  ON public.content_cards (published_at DESC NULLS LAST)
  WHERE status IN ('publicado', 'arquivado');
CREATE INDEX IF NOT EXISTS content_cards_legacy_post_idx
  ON public.content_cards (legacy_post_id)
  WHERE legacy_post_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_cards TO authenticated;
GRANT ALL ON public.content_cards TO service_role;

ALTER TABLE public.content_cards ENABLE ROW LEVEL SECURITY;

-- ---------- story_plan_rows ----------

CREATE TABLE IF NOT EXISTS public.story_plan_rows (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_cliente_id bigint NOT NULL REFERENCES public.cadastro_clientes(id) ON DELETE CASCADE,
  card_id             uuid REFERENCES public.content_cards(id) ON DELETE SET NULL,
  semana_inicio       date NOT NULL,
  dia_semana          smallint NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  periodo             text,
  titulo              text,
  observacoes         text,
  checklist           jsonb NOT NULL DEFAULT '[]'::jsonb,
  ordem               int NOT NULL DEFAULT 0,
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT story_plan_rows_checklist_is_array
    CHECK (jsonb_typeof(checklist) = 'array')
);

CREATE INDEX IF NOT EXISTS story_plan_rows_cliente_semana_idx
  ON public.story_plan_rows (cadastro_cliente_id, semana_inicio, ordem);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_plan_rows TO authenticated;
GRANT ALL ON public.story_plan_rows TO service_role;

ALTER TABLE public.story_plan_rows ENABLE ROW LEVEL SECURITY;

-- ---------- content_card_events (append-only timeline) ----------

CREATE TABLE IF NOT EXISTS public.content_card_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id      uuid NOT NULL REFERENCES public.content_cards(id) ON DELETE RESTRICT,
  actor_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email  text,
  event_type   public.content_card_event_type NOT NULL,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_card_events_card_idx
  ON public.content_card_events (card_id, created_at DESC);

GRANT SELECT, INSERT ON public.content_card_events TO authenticated;
GRANT ALL ON public.content_card_events TO service_role;

ALTER TABLE public.content_card_events ENABLE ROW LEVEL SECURITY;

-- ---------- content_card_attachments ----------

CREATE TABLE IF NOT EXISTS public.content_card_attachments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id          uuid NOT NULL REFERENCES public.content_cards(id) ON DELETE RESTRICT,
  storage_path     text NOT NULL,
  mime_type        text NOT NULL,
  kind             text NOT NULL CHECK (kind IN ('image', 'video', 'pdf', 'document', 'audio')),
  media_role       text NOT NULL DEFAULT 'preview'
    CHECK (media_role IN ('preview', 'attachment')),
  file_name        text,
  file_size        bigint,
  ordem            int NOT NULL DEFAULT 0,
  width            int,
  height           int,
  duration_seconds numeric(10, 2),
  poster_path      text,
  legacy_media_id  uuid,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_card_attachments_card_ordem_idx
  ON public.content_card_attachments (card_id, ordem ASC);

GRANT SELECT, INSERT, DELETE ON public.content_card_attachments TO authenticated;
GRANT ALL ON public.content_card_attachments TO service_role;

ALTER TABLE public.content_card_attachments ENABLE ROW LEVEL SECURITY;

-- ---------- Triggers: content_cards ----------

CREATE OR REPLACE FUNCTION public.tg_content_cards_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_cards_touch ON public.content_cards;
CREATE TRIGGER content_cards_touch
  BEFORE UPDATE ON public.content_cards
  FOR EACH ROW EXECUTE FUNCTION public.tg_content_cards_touch();

CREATE OR REPLACE FUNCTION public.tg_content_cards_client_guard()
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

  IF NEW.cliente_nome IS DISTINCT FROM OLD.cliente_nome
    OR NEW.cadastro_cliente_id IS DISTINCT FROM OLD.cadastro_cliente_id
    OR NEW.plataforma IS DISTINCT FROM OLD.plataforma
    OR NEW.formato IS DISTINCT FROM OLD.formato
    OR NEW.titulo IS DISTINCT FROM OLD.titulo
    OR NEW.legenda IS DISTINCT FROM OLD.legenda
    OR NEW.copy_text IS DISTINCT FROM OLD.copy_text
    OR NEW.roteiro IS DISTINCT FROM OLD.roteiro
    OR NEW.direcao_arte IS DISTINCT FROM OLD.direcao_arte
    OR NEW.cta IS DISTINCT FROM OLD.cta
    OR NEW.capa_url IS DISTINCT FROM OLD.capa_url
    OR NEW.data_publicacao IS DISTINCT FROM OLD.data_publicacao
    OR NEW.hora_publicacao IS DISTINCT FROM OLD.hora_publicacao
    OR NEW.checklist IS DISTINCT FROM OLD.checklist
    OR NEW.localizacao IS DISTINCT FROM OLD.localizacao
    OR NEW.tags IS DISTINCT FROM OLD.tags
    OR NEW.observacoes IS DISTINCT FROM OLD.observacoes
    OR NEW.responsavel_email IS DISTINCT FROM OLD.responsavel_email
    OR NEW.responsavel_user_id IS DISTINCT FROM OLD.responsavel_user_id
    OR NEW.pilar_id IS DISTINCT FROM OLD.pilar_id
    OR NEW.estrategia_id IS DISTINCT FROM OLD.estrategia_id
    OR NEW.kanban_ordem IS DISTINCT FROM OLD.kanban_ordem
    OR NEW.published_at IS DISTINCT FROM OLD.published_at
    OR NEW.archived_at IS DISTINCT FROM OLD.archived_at
    OR NEW.ai_metadata IS DISTINCT FROM OLD.ai_metadata
    OR NEW.integration_metadata IS DISTINCT FROM OLD.integration_metadata
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Clientes só podem alterar status via fluxo de aprovação.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status <> 'aguardando_aprovacao'
      OR NEW.status NOT IN ('aprovado', 'edicao') THEN
      RAISE EXCEPTION 'Transição de status não permitida para clientes (% -> %).',
        OLD.status, NEW.status
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_cards_client_guard ON public.content_cards;
CREATE TRIGGER content_cards_client_guard
  BEFORE UPDATE ON public.content_cards
  FOR EACH ROW EXECUTE FUNCTION public.tg_content_cards_client_guard();

CREATE OR REPLACE FUNCTION public.tg_content_cards_prevent_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IN ('publicado', 'arquivado') THEN
    RAISE EXCEPTION 'Hard delete proibido para cards publicados ou arquivados.'
      USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS content_cards_prevent_hard_delete ON public.content_cards;
CREATE TRIGGER content_cards_prevent_hard_delete
  BEFORE DELETE ON public.content_cards
  FOR EACH ROW EXECUTE FUNCTION public.tg_content_cards_prevent_hard_delete();

-- ---------- Triggers: content_card_events (immutable) ----------

CREATE OR REPLACE FUNCTION public.tg_content_card_events_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'content_card_events é append-only — UPDATE/DELETE proibidos.'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS content_card_events_immutable_u ON public.content_card_events;
CREATE TRIGGER content_card_events_immutable_u
  BEFORE UPDATE ON public.content_card_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_content_card_events_immutable();

DROP TRIGGER IF EXISTS content_card_events_immutable_d ON public.content_card_events;
CREATE TRIGGER content_card_events_immutable_d
  BEFORE DELETE ON public.content_card_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_content_card_events_immutable();

-- ---------- RLS: content_cards ----------

DROP POLICY IF EXISTS content_cards_admin_all ON public.content_cards;
CREATE POLICY content_cards_admin_all ON public.content_cards
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS content_cards_client_select ON public.content_cards;
CREATE POLICY content_cards_client_select ON public.content_cards
  FOR SELECT TO authenticated
  USING (cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes()));

DROP POLICY IF EXISTS content_cards_client_update ON public.content_cards;
CREATE POLICY content_cards_client_update ON public.content_cards
  FOR UPDATE TO authenticated
  USING (cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes()))
  WITH CHECK (cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes()));

-- ---------- RLS: content_card_events ----------

DROP POLICY IF EXISTS content_card_events_admin_all ON public.content_card_events;
CREATE POLICY content_card_events_admin_all ON public.content_card_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS content_card_events_client_select ON public.content_card_events;
CREATE POLICY content_card_events_client_select ON public.content_card_events
  FOR SELECT TO authenticated
  USING (
    card_id IN (
      SELECT id FROM public.content_cards
      WHERE cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    )
  );

DROP POLICY IF EXISTS content_card_events_client_insert ON public.content_card_events;
CREATE POLICY content_card_events_client_insert ON public.content_card_events
  FOR INSERT TO authenticated
  WITH CHECK (
    event_type = 'commented'
    AND card_id IN (
      SELECT id FROM public.content_cards
      WHERE cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    )
  );

-- ---------- RLS: content_card_attachments ----------

DROP POLICY IF EXISTS content_card_attachments_admin_all ON public.content_card_attachments;
CREATE POLICY content_card_attachments_admin_all ON public.content_card_attachments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS content_card_attachments_client_select ON public.content_card_attachments;
CREATE POLICY content_card_attachments_client_select ON public.content_card_attachments
  FOR SELECT TO authenticated
  USING (
    card_id IN (
      SELECT id FROM public.content_cards
      WHERE cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    )
  );

-- ---------- RLS: editorial_pillars ----------

DROP POLICY IF EXISTS editorial_pillars_admin_all ON public.editorial_pillars;
CREATE POLICY editorial_pillars_admin_all ON public.editorial_pillars
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS editorial_pillars_client_select ON public.editorial_pillars;
CREATE POLICY editorial_pillars_client_select ON public.editorial_pillars
  FOR SELECT TO authenticated
  USING (
    cadastro_cliente_id IN (
      SELECT cc.id FROM public.cadastro_clientes cc
      WHERE cc.nome_cliente IN (SELECT cliente_nome FROM public.current_user_clientes())
    )
  );

-- ---------- RLS: story_plan_rows ----------

DROP POLICY IF EXISTS story_plan_rows_admin_all ON public.story_plan_rows;
CREATE POLICY story_plan_rows_admin_all ON public.story_plan_rows
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS story_plan_rows_client_select ON public.story_plan_rows;
CREATE POLICY story_plan_rows_client_select ON public.story_plan_rows
  FOR SELECT TO authenticated
  USING (
    cadastro_cliente_id IN (
      SELECT cc.id FROM public.cadastro_clientes cc
      WHERE cc.nome_cliente IN (SELECT cliente_nome FROM public.current_user_clientes())
    )
  );

-- ---------- Backfill: posts_editorial → content_cards ----------

INSERT INTO public.content_cards (
  id,
  cadastro_cliente_id,
  cliente_nome,
  data_publicacao,
  titulo,
  legenda,
  plataforma,
  formato,
  capa_url,
  status,
  localizacao,
  tags,
  observacoes,
  responsavel_email,
  estrategia_id,
  legacy_post_id,
  created_by,
  created_at,
  updated_at,
  published_at
)
SELECT
  p.id,
  p.cadastro_cliente_id,
  p.cliente_nome,
  p.data_publicacao,
  p.titulo,
  p.legenda,
  p.plataforma,
  p.formato,
  p.capa_url,
  public.map_legacy_post_status_to_content(p.status),
  p.localizacao,
  COALESCE(p.tags, '{}'),
  p.observacoes,
  p.responsavel_email,
  p.estrategia_id,
  p.id,
  p.created_by,
  p.created_at,
  p.updated_at,
  CASE WHEN p.status = 'publicado' THEN p.updated_at ELSE NULL END
FROM public.posts_editorial p
ON CONFLICT (id) DO NOTHING;

-- ---------- Backfill: post_media → content_card_attachments ----------

INSERT INTO public.content_card_attachments (
  id,
  card_id,
  storage_path,
  mime_type,
  kind,
  media_role,
  ordem,
  width,
  height,
  duration_seconds,
  poster_path,
  legacy_media_id,
  created_at
)
SELECT
  m.id,
  m.post_id,
  m.storage_path,
  m.mime_type,
  m.kind,
  'preview',
  m.ordem,
  m.width,
  m.height,
  m.duration_seconds,
  m.poster_path,
  m.id,
  m.created_at
FROM public.post_media m
WHERE EXISTS (SELECT 1 FROM public.content_cards c WHERE c.id = m.post_id)
ON CONFLICT (id) DO NOTHING;

-- ---------- Backfill: post_revisions → content_card_events ----------

INSERT INTO public.content_card_events (
  id,
  card_id,
  actor_id,
  actor_email,
  event_type,
  payload,
  created_at
)
SELECT
  r.id,
  r.post_id,
  r.autor_id,
  r.autor_email,
  public.map_legacy_revision_tipo_to_event(r.tipo),
  jsonb_strip_nulls(jsonb_build_object(
    'legacy_tipo', r.tipo::text,
    'mensagem', r.mensagem,
    'status_de', r.status_de::text,
    'status_para', r.status_para::text,
    'source', 'post_revisions_backfill'
  )),
  r.created_at
FROM public.post_revisions r
WHERE EXISTS (SELECT 1 FROM public.content_cards c WHERE c.id = r.post_id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.content_card_events (card_id, actor_id, event_type, payload, created_at)
SELECT
  c.id,
  c.created_by,
  'created'::public.content_card_event_type,
  jsonb_build_object('source', 'backfill_created'),
  c.created_at
FROM public.content_cards c
WHERE NOT EXISTS (
  SELECT 1 FROM public.content_card_events e
  WHERE e.card_id = c.id AND e.event_type = 'created'
);
