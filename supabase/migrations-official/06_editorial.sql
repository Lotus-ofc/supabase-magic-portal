-- =========================================================
-- 06_editorial.sql  (aditivo, idempotente)
-- Projeto: ywvhoctcmibjitvwkkhb
-- Calendário Editorial + Aprovação de Conteúdo.
-- NÃO altera base_metricas nem cadastro_clientes.
-- =========================================================

-- ---------- ENUMs ----------
DO $$ BEGIN
  CREATE TYPE public.post_status AS ENUM (
    'rascunho',
    'em_producao',
    'aguardando_aprovacao',
    'aprovado',
    'publicado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.post_revision_tipo AS ENUM (
    'comentario',
    'solicitacao_alteracao',
    'aprovacao',
    'mudanca_status'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- posts_editorial ----------
CREATE TABLE IF NOT EXISTS public.posts_editorial (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_cliente_id  bigint NOT NULL REFERENCES public.cadastro_clientes(id) ON DELETE CASCADE,
  cliente_nome         text NOT NULL,
  data_publicacao      date NOT NULL,
  titulo               text NOT NULL,
  legenda              text,
  plataforma           text NOT NULL DEFAULT 'instagram',
  formato              text,                 -- feed, story, reel, carrossel...
  capa_url             text,
  status               public.post_status NOT NULL DEFAULT 'rascunho',
  created_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS posts_editorial_cliente_data_idx
  ON public.posts_editorial (cadastro_cliente_id, data_publicacao);
CREATE INDEX IF NOT EXISTS posts_editorial_status_idx
  ON public.posts_editorial (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts_editorial TO authenticated;
GRANT ALL ON public.posts_editorial TO service_role;

ALTER TABLE public.posts_editorial ENABLE ROW LEVEL SECURITY;

-- Admin: tudo
DROP POLICY IF EXISTS "posts_admin_all" ON public.posts_editorial;
CREATE POLICY "posts_admin_all" ON public.posts_editorial
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Cliente: lê posts dos clientes que tem acesso
DROP POLICY IF EXISTS "posts_client_select" ON public.posts_editorial;
CREATE POLICY "posts_client_select" ON public.posts_editorial
  FOR SELECT TO authenticated
  USING (cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes()));

-- Cliente: pode atualizar SÓ o status para aprovado / solicitar alteração
-- (controle fino fica na server fn; RLS permite update e a fn restringe campos).
DROP POLICY IF EXISTS "posts_client_update" ON public.posts_editorial;
CREATE POLICY "posts_client_update" ON public.posts_editorial
  FOR UPDATE TO authenticated
  USING (cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes()))
  WITH CHECK (cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes()));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_posts_editorial_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS posts_editorial_touch ON public.posts_editorial;
CREATE TRIGGER posts_editorial_touch
  BEFORE UPDATE ON public.posts_editorial
  FOR EACH ROW EXECUTE FUNCTION public.tg_posts_editorial_touch();

-- ---------- post_revisions (histórico + comentários de aprovação) ----------
CREATE TABLE IF NOT EXISTS public.post_revisions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      uuid NOT NULL REFERENCES public.posts_editorial(id) ON DELETE CASCADE,
  autor_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_email  text,
  tipo         public.post_revision_tipo NOT NULL,
  mensagem     text,
  status_de    public.post_status,
  status_para  public.post_status,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS post_revisions_post_idx
  ON public.post_revisions (post_id, created_at DESC);

GRANT SELECT, INSERT ON public.post_revisions TO authenticated;
GRANT ALL ON public.post_revisions TO service_role;

ALTER TABLE public.post_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "revisions_admin_all" ON public.post_revisions;
CREATE POLICY "revisions_admin_all" ON public.post_revisions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "revisions_client_select" ON public.post_revisions;
CREATE POLICY "revisions_client_select" ON public.post_revisions
  FOR SELECT TO authenticated
  USING (
    post_id IN (
      SELECT id FROM public.posts_editorial
      WHERE cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    )
  );

DROP POLICY IF EXISTS "revisions_client_insert" ON public.post_revisions;
CREATE POLICY "revisions_client_insert" ON public.post_revisions
  FOR INSERT TO authenticated
  WITH CHECK (
    post_id IN (
      SELECT id FROM public.posts_editorial
      WHERE cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    )
  );
