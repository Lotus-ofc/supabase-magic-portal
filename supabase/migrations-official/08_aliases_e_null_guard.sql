-- =========================================================
-- 08_aliases_e_null_guard.sql  (aditivo · só corrige relacionamento e NULLs)
-- Projeto: ywvhoctcmibjitvwkkhb
--
-- CAUSA RAIZ DOS DASHBOARDS COM NÚMEROS INCORRETOS:
--
-- (A) Google Ads spend chega em micros do Google Ads API
--     (ex.: 164.824.476 → R$ 164,82).
--     → JÁ corrigido em 02_views_metricas.sql e 07_views_fix_security_invoker.sql:
--       CASE WHEN lower(plataforma)='google ads' AND lower(metrica)='spend'
--            THEN valor / 1000000.0 ELSE valor END
--     Esta migration NÃO duplica a regra — apenas reforça no comentário.
--
-- (B) Divergência de nomes entre base_metricas.cliente (vindo do Make/planilha
--     legada) e cadastro_clientes.nome_cliente:
--        base_metricas        cadastro_clientes
--        "Antena"          ←→ "Antena Imobiliária"
--        "Big Frio juec"   ←→ "BigFrioJuec"
--        "Rafa Teo"        ←→ "Rafa Teo Ferreira"
--     Toda a UI joga com o NOME do cadastro (links /cliente/$cliente,
--     client_access.cliente_nome). As views filtram por base_metricas.cliente
--     literal. Resultado: cliente final vê dashboard vazio; admin vê linhas
--     duplicadas (um card por grafia).
--     → CORREÇÃO: tabela cliente_aliases (additiva) + COALESCE no normalize.
--       Todas as views passam a expor SEMPRE o nome canônico (do cadastro).
--       Nenhum dado é alterado, nenhum cenário do Make precisa mudar.
--
-- (C) Linhas com valor NULL (Antena/Meta, Rafa Teo/Meta, BigFrio/GA4,
--     Rodrigo Borba/GA4) contaminavam médias e produziam buracos em deltas.
--     → CORREÇÃO: WHERE bm.valor IS NOT NULL no normalize.
--       SUM/AVG já ignoram NULL no Postgres, mas o filtro elimina ruído
--       e mantém o array de plataformas_ativas honesto.
--
-- NÃO altera base_metricas. NÃO altera cadastro_clientes (apenas LÊ).
-- NÃO altera estrutura das colunas das views (mesmos nomes, mesmos tipos).
-- =========================================================

-- ---------- 1. Tabela de aliases (cadastro_clientes ↔ base_metricas) ----------
CREATE TABLE IF NOT EXISTS public.cliente_aliases (
  id              serial PRIMARY KEY,
  nome_canonico   text NOT NULL,                -- == cadastro_clientes.nome_cliente
  alias_metricas  text NOT NULL UNIQUE,         -- == base_metricas.cliente
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cliente_aliases_canonico
  ON public.cliente_aliases (nome_canonico);

GRANT SELECT ON public.cliente_aliases TO authenticated;
GRANT ALL    ON public.cliente_aliases TO service_role;

ALTER TABLE public.cliente_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cliente_aliases_select_auth" ON public.cliente_aliases;
CREATE POLICY "cliente_aliases_select_auth" ON public.cliente_aliases
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "cliente_aliases_admin_all" ON public.cliente_aliases;
CREATE POLICY "cliente_aliases_admin_all" ON public.cliente_aliases
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seeds dos 3 aliases conhecidos (idempotente)
INSERT INTO public.cliente_aliases (nome_canonico, alias_metricas) VALUES
  ('Antena Imobiliária', 'Antena'),
  ('BigFrioJuec',         'Big Frio juec'),
  ('Rafa Teo Ferreira',   'Rafa Teo')
ON CONFLICT (alias_metricas) DO NOTHING;

-- ---------- 2. current_user_clientes — agora retorna nome CANÔNICO ----------
-- Admin: SELECT DISTINCT sobre o nome canônico (sem duplicar grafias).
-- Cliente: client_access.cliente_nome já guarda o nome do cadastro.
CREATE OR REPLACE FUNCTION public.current_user_clientes()
RETURNS TABLE (cliente_nome text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ca.cliente_nome
  FROM public.client_access ca
  WHERE ca.user_id = auth.uid()
  UNION
  SELECT DISTINCT COALESCE(al.nome_canonico, bm.cliente)
  FROM public.base_metricas bm
  LEFT JOIN public.cliente_aliases al ON al.alias_metricas = bm.cliente
  WHERE public.has_role(auth.uid(), 'admin');
$$;

-- ---------- 3. vw_metricas_normalizadas — COALESCE + guarda de NULL ----------
-- Garantias:
--   • cliente exposto sempre é o nome canônico (do cadastro);
--   • Google Ads spend convertido de micros para moeda;
--   • linhas com valor NULL excluídas;
--   • RLS contornada via SECURITY DEFINER (default sem security_invoker).
CREATE OR REPLACE VIEW public.vw_metricas_normalizadas AS
SELECT
  bm.id,
  bm.data,
  COALESCE(al.nome_canonico, bm.cliente) AS cliente,
  CASE lower(bm.plataforma)
    WHEN 'meta ads'           THEN 'meta_ads'
    WHEN 'google ads'         THEN 'google_ads'
    WHEN 'google analytics 4' THEN 'ga4'
    WHEN 'instagram'          THEN 'instagram'
    WHEN 'google business'    THEN 'google_business'
    WHEN 'tiktok'             THEN 'tiktok'
    ELSE lower(replace(bm.plataforma, ' ', '_'))
  END AS plataforma,
  lower(bm.metrica) AS metrica,
  CASE
    WHEN lower(bm.plataforma) = 'google ads' AND lower(bm.metrica) = 'spend'
      THEN bm.valor / 1000000.0
    ELSE bm.valor
  END AS valor,
  bm.campanha,
  bm.created_at
FROM public.base_metricas bm
LEFT JOIN public.cliente_aliases al ON al.alias_metricas = bm.cliente
WHERE bm.valor IS NOT NULL
  AND COALESCE(al.nome_canonico, bm.cliente)
      IN (SELECT cliente_nome FROM public.current_user_clientes());

GRANT SELECT ON public.vw_metricas_normalizadas TO authenticated;

-- ---------- 4. Views derivadas — sem mudança estrutural ----------
-- Recriadas só para reaproveitar o normalize atualizado (mesmas colunas).
-- (Postgres invalida automaticamente views dependentes em CREATE OR REPLACE,
--  então recriamos explicitamente para evitar surpresa.)

CREATE OR REPLACE VIEW public.vw_meta_ads_diario AS
SELECT
  data, cliente, campanha,
  SUM(valor) FILTER (WHERE metrica = 'reach')       AS reach,
  SUM(valor) FILTER (WHERE metrica = 'impressions') AS impressions,
  SUM(valor) FILTER (WHERE metrica = 'clicks')      AS clicks,
  AVG(valor) FILTER (WHERE metrica = 'cpc')         AS cpc,
  AVG(valor) FILTER (WHERE metrica = 'cpm')         AS cpm,
  AVG(valor) FILTER (WHERE metrica = 'ctr')         AS ctr,
  AVG(valor) FILTER (WHERE metrica = 'frequency')   AS frequency,
  SUM(valor) FILTER (WHERE metrica = 'spend')       AS spend
FROM public.vw_metricas_normalizadas
WHERE plataforma = 'meta_ads'
GROUP BY data, cliente, campanha;
GRANT SELECT ON public.vw_meta_ads_diario TO authenticated;

CREATE OR REPLACE VIEW public.vw_google_ads_diario AS
WITH base AS (
  SELECT
    data, cliente, campanha,
    SUM(valor) FILTER (WHERE metrica = 'impressions') AS impressions,
    SUM(valor) FILTER (WHERE metrica = 'clicks')      AS clicks,
    SUM(valor) FILTER (WHERE metrica = 'spend')       AS spend
  FROM public.vw_metricas_normalizadas
  WHERE plataforma = 'google_ads'
  GROUP BY data, cliente, campanha
)
SELECT
  data, cliente, campanha,
  impressions, clicks, spend,
  CASE WHEN impressions > 0 THEN (clicks::numeric / impressions) * 100 END AS ctr,
  CASE WHEN clicks      > 0 THEN spend / clicks                          END AS cpc,
  CASE WHEN impressions > 0 THEN (spend / impressions) * 1000            END AS cpm
FROM base;
GRANT SELECT ON public.vw_google_ads_diario TO authenticated;

CREATE OR REPLACE VIEW public.vw_ga4_diario AS
SELECT
  data, cliente,
  SUM(valor) FILTER (WHERE metrica = 'activeusers')     AS active_users,
  SUM(valor) FILTER (WHERE metrica = 'sessions')        AS sessions,
  SUM(valor) FILTER (WHERE metrica = 'engagedsessions') AS engaged_sessions,
  SUM(valor) FILTER (WHERE metrica = 'screenpageviews') AS pageviews,
  SUM(valor) FILTER (WHERE metrica = 'eventcount')      AS event_count,
  SUM(valor) FILTER (WHERE metrica = 'conversions')     AS conversions,
  CASE
    WHEN SUM(valor) FILTER (WHERE metrica = 'sessions') > 0
    THEN SUM(valor) FILTER (WHERE metrica = 'engagedsessions')
       / SUM(valor) FILTER (WHERE metrica = 'sessions') * 100
  END AS engagement_rate
FROM public.vw_metricas_normalizadas
WHERE plataforma = 'ga4'
GROUP BY data, cliente;
GRANT SELECT ON public.vw_ga4_diario TO authenticated;

CREATE OR REPLACE VIEW public.vw_instagram_diario AS
SELECT
  data, cliente,
  SUM(valor) FILTER (WHERE metrica = 'reach')              AS reach,
  SUM(valor) FILTER (WHERE metrica = 'total_interactions') AS interactions,
  SUM(valor) FILTER (WHERE metrica = 'accounts_engaged')   AS accounts_engaged,
  SUM(valor) FILTER (WHERE metrica = 'likes')              AS likes,
  SUM(valor) FILTER (WHERE metrica = 'comments')           AS comments,
  SUM(valor) FILTER (WHERE metrica = 'saves')              AS saves,
  SUM(valor) FILTER (WHERE metrica = 'shares')             AS shares,
  SUM(valor) FILTER (WHERE metrica = 'profile_links_taps') AS profile_links_taps,
  CASE
    WHEN SUM(valor) FILTER (WHERE metrica = 'reach') > 0
    THEN SUM(valor) FILTER (WHERE metrica = 'total_interactions')
       / SUM(valor) FILTER (WHERE metrica = 'reach') * 100
  END AS engagement_rate
FROM public.vw_metricas_normalizadas
WHERE plataforma = 'instagram'
GROUP BY data, cliente;
GRANT SELECT ON public.vw_instagram_diario TO authenticated;

CREATE OR REPLACE VIEW public.vw_google_business_diario AS
SELECT
  data, cliente,
  SUM(valor) FILTER (WHERE metrica = 'profile_views')      AS profile_views,
  SUM(valor) FILTER (WHERE metrica = 'searches')           AS searches,
  SUM(valor) FILTER (WHERE metrica = 'direction_requests') AS direction_requests,
  SUM(valor) FILTER (WHERE metrica = 'website_clicks')     AS website_clicks,
  SUM(valor) FILTER (WHERE metrica = 'phone_calls')        AS phone_calls,
  SUM(valor) FILTER (WHERE metrica = 'messages')           AS messages,
  SUM(valor) FILTER (WHERE metrica = 'photo_views')        AS photo_views,
  SUM(valor) FILTER (WHERE metrica = 'reviews_count')      AS reviews_count,
  AVG(valor) FILTER (WHERE metrica = 'reviews_rating')     AS reviews_rating
FROM public.vw_metricas_normalizadas
WHERE plataforma = 'google_business'
GROUP BY data, cliente;
GRANT SELECT ON public.vw_google_business_diario TO authenticated;

CREATE OR REPLACE VIEW public.vw_overview_cliente AS
SELECT
  data, cliente,
  SUM(valor) FILTER (WHERE plataforma = 'meta_ads'   AND metrica = 'spend')             AS meta_spend,
  SUM(valor) FILTER (WHERE plataforma = 'google_ads' AND metrica = 'spend')             AS google_spend,
  SUM(valor) FILTER (WHERE plataforma IN ('meta_ads','google_ads') AND metrica = 'impressions') AS total_impressions,
  SUM(valor) FILTER (WHERE plataforma IN ('meta_ads','google_ads') AND metrica = 'clicks')      AS total_clicks,
  SUM(valor) FILTER (WHERE plataforma = 'ga4'        AND metrica = 'sessions')          AS ga4_sessions,
  SUM(valor) FILTER (WHERE plataforma = 'ga4'        AND metrica = 'conversions')       AS ga4_conversions,
  SUM(valor) FILTER (WHERE plataforma = 'instagram'  AND metrica = 'reach')             AS instagram_reach,
  SUM(valor) FILTER (WHERE plataforma = 'instagram'  AND metrica = 'total_interactions') AS instagram_interactions
FROM public.vw_metricas_normalizadas
GROUP BY data, cliente;
GRANT SELECT ON public.vw_overview_cliente TO authenticated;

CREATE OR REPLACE VIEW public.vw_clientes_ativos AS
SELECT
  cliente,
  MAX(data)                                          AS ultima_data_recebida,
  MAX(created_at)                                    AS ultima_ingestao,
  array_agg(DISTINCT plataforma ORDER BY plataforma) AS plataformas_ativas,
  COUNT(*)                                           AS total_registros
FROM public.vw_metricas_normalizadas
GROUP BY cliente;
GRANT SELECT ON public.vw_clientes_ativos TO authenticated;

-- =========================================================
-- VALIDAÇÃO (rodar manualmente após aplicar):
--
-- 1) Aliases ativos:
--    SELECT * FROM public.cliente_aliases;
--    -- esperado: 3 linhas (Antena Imobiliária, BigFrioJuec, Rafa Teo Ferreira)
--
-- 2) Nomes canônicos visíveis ao admin (sem duplicatas):
--    SELECT * FROM public.vw_clientes_ativos ORDER BY cliente;
--    -- esperado: 6 clientes — sem "Antena" + "Antena Imobiliária" repetidos
--
-- 3) Google Ads spend em moeda (não micros):
--    SELECT data, cliente, SUM(spend) AS spend_brl
--    FROM public.vw_google_ads_diario
--    GROUP BY data, cliente ORDER BY data DESC LIMIT 10;
--    -- esperado: valores em R$ realistas (ex.: 164.82, não 164824476)
--
-- 4) Sem NULL contaminando:
--    SELECT COUNT(*) FROM public.vw_metricas_normalizadas WHERE valor IS NULL;
--    -- esperado: 0
--
-- 5) Cliente individual (login do cliente "Antena Imobiliária"):
--    SELECT * FROM public.vw_overview_cliente LIMIT 5;
--    -- esperado: linhas com cliente='Antena Imobiliária' e valores válidos
-- =========================================================
