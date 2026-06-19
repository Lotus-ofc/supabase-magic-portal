-- =========================================================
-- 01_auth_roles_access.sql  (aditivo, idempotente)
-- Projeto: ywvhoctcmibjitvwkkhb
-- NÃO altera base_metricas nem cadastro_clientes.
-- =========================================================

-- ---------- profiles ----------
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text,
  nome        text,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Cria o trigger apenas se ainda não existir (não usa DROP em auth.users).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
      AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- ---------- Índices aditivos em base_metricas (não alteram estrutura/dados) ----------
CREATE INDEX IF NOT EXISTS idx_base_metricas_cliente_data
  ON public.base_metricas (cliente, data);

CREATE INDEX IF NOT EXISTS idx_base_metricas_plataforma
  ON public.base_metricas (plataforma);

-- ---------- roles ----------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'cliente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ---------- has_role (security definer; evita recursão de RLS) ----------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- ---------- client_access (mapeia user -> cliente que pode ver) ----------
CREATE TABLE IF NOT EXISTS public.client_access (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_nome  text NOT NULL,            -- chave de join atual (base_metricas.cliente)
  cliente_id    uuid,                     -- futuro FK para cadastro_clientes (quando normalizar)
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, cliente_nome)
);

GRANT SELECT ON public.client_access TO authenticated;
GRANT ALL ON public.client_access TO service_role;

ALTER TABLE public.client_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_access_select_own" ON public.client_access;
CREATE POLICY "client_access_select_own" ON public.client_access
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "client_access_admin_all" ON public.client_access;
CREATE POLICY "client_access_admin_all" ON public.client_access
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- current_user_clientes ----------
-- DÉBITO TÉCNICO: para admins, faz SELECT DISTINCT em base_metricas.
-- Substituir por catálogo dedicado (ex.: vw_clientes_ativos materializada
-- ou tabela clientes_catalogo) quando a base crescer.
CREATE OR REPLACE FUNCTION public.current_user_clientes()
RETURNS TABLE (cliente_nome text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ca.cliente_nome
  FROM public.client_access ca
  WHERE ca.user_id = auth.uid()
  UNION
  SELECT DISTINCT bm.cliente
  FROM public.base_metricas bm
  WHERE public.has_role(auth.uid(), 'admin');
$$;
