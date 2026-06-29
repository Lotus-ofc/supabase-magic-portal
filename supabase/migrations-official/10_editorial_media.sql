-- =========================================================
-- 10_editorial_media.sql  (aditivo, idempotente)
-- Mídia editorial (upload), metadados estendidos e snapshots.
-- =========================================================

-- Campos adicionais em posts_editorial
ALTER TABLE public.posts_editorial
  ADD COLUMN IF NOT EXISTS localizacao text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS responsavel_email text;

-- Tipo reprovacao no histórico
DO $$ BEGIN
  ALTER TYPE public.post_revision_tipo ADD VALUE IF NOT EXISTS 'reprovacao';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- post_media ----------
CREATE TABLE IF NOT EXISTS public.post_media (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         uuid NOT NULL REFERENCES public.posts_editorial(id) ON DELETE CASCADE,
  storage_path    text NOT NULL,
  mime_type       text NOT NULL,
  kind            text NOT NULL CHECK (kind IN ('image', 'video')),
  ordem           int NOT NULL DEFAULT 0,
  width           int,
  height          int,
  duration_seconds numeric(10,2),
  poster_path     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS post_media_post_ordem_idx
  ON public.post_media (post_id, ordem ASC);

GRANT SELECT, INSERT, DELETE ON public.post_media TO authenticated;
GRANT ALL ON public.post_media TO service_role;

ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_media_admin_all" ON public.post_media;
CREATE POLICY "post_media_admin_all" ON public.post_media
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "post_media_client_select" ON public.post_media;
CREATE POLICY "post_media_client_select" ON public.post_media
  FOR SELECT TO authenticated
  USING (
    post_id IN (
      SELECT id FROM public.posts_editorial
      WHERE cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    )
  );

-- ---------- post_snapshots (comparação de versões) ----------
CREATE TABLE IF NOT EXISTS public.post_snapshots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      uuid NOT NULL REFERENCES public.posts_editorial(id) ON DELETE CASCADE,
  snapshot     jsonb NOT NULL,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS post_snapshots_post_idx
  ON public.post_snapshots (post_id, created_at DESC);

GRANT SELECT, INSERT ON public.post_snapshots TO authenticated;
GRANT ALL ON public.post_snapshots TO service_role;

ALTER TABLE public.post_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_snapshots_admin_all" ON public.post_snapshots;
CREATE POLICY "post_snapshots_admin_all" ON public.post_snapshots
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "post_snapshots_client_select" ON public.post_snapshots;
CREATE POLICY "post_snapshots_client_select" ON public.post_snapshots
  FOR SELECT TO authenticated
  USING (
    post_id IN (
      SELECT id FROM public.posts_editorial
      WHERE cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    )
  );

-- ---------- Storage bucket editorial-media ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'editorial-media',
  'editorial-media',
  false,
  104857600,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "editorial_media_admin_all" ON storage.objects;
CREATE POLICY "editorial_media_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'editorial-media' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'editorial-media' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "editorial_media_client_read" ON storage.objects;
CREATE POLICY "editorial_media_client_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'editorial-media'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.posts_editorial
      WHERE cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    )
  );
