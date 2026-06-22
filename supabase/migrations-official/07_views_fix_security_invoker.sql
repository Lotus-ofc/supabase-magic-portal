-- =========================================================
-- 07_views_fix_security_invoker.sql  (aditivo · só recria views)
-- Projeto: ywvhoctcmibjitvwkkhb
--
-- CAUSA RAIZ DOS DASHBOARDS VAZIOS:
-- As views analíticas (02_views_metricas.sql) foram criadas com
-- security_invoker=on. Isso faz a leitura de public.base_metricas
-- rodar com as permissões do usuário autenticado. Como base_metricas
-- tem RLS habilitado e NENHUMA policy concede SELECT ao role
-- 'authenticated', a leitura retorna 0 linhas — mesmo para o admin.
-- Consequência: vw_metricas_normalizadas → 0 linhas →
-- vw_overview_cliente / vw_clientes_ativos / vw_*_diario → vazios.
--
-- COMPROVADO via REST API:
--   GET /rest/v1/base_metricas?select=count  (admin JWT) → */0
--   POST /rest/v1/rpc/current_user_clientes  (admin JWT) → 6 clientes
--   GET /rest/v1/vw_overview_cliente         (admin JWT) → []
--
-- CORREÇÃO MÍNIMA:
-- Recriar as views como SECURITY DEFINER (padrão Postgres — sem o
-- security_invoker=on). A view passa a ler base_metricas com as
-- permissões do owner (postgres), contornando a RLS da tabela legacy.
-- A ISOLAÇÃO POR CLIENTE CONTINUA INTACTA: o WHERE de
-- vw_metricas_normalizadas filtra por current_user_clientes(), que é
-- SECURITY DEFINER e lê auth.uid() do JWT do chamador. Admin segue
-- vendo tudo (has_role admin → DISTINCT cliente), cliente segue
-- vendo só os seus (client_access).
--
-- NÃO altera base_metricas. NÃO altera cadastro_clientes. NÃO altera
-- estrutura de nenhuma view (mesmas colunas, mesmas regras).
-- =========================================================

CREATE OR REPLACE VIEW public.vw_metricas_normalizadas AS
SELECT
  bm.id,
  bm.data,
  bm.cliente,
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
WHERE bm.cliente IN (SELECT cliente_nome FROM public.current_user_clientes());

GRANT SELECT ON public.vw_metricas_normalizadas TO authenticated;

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
  MAX(data)                         AS ultima_data_recebida,
  MAX(created_at)                   AS ultima_ingestao,
  array_agg(DISTINCT plataforma ORDER BY plataforma) AS plataformas_ativas,
  COUNT(*)                          AS total_registros
FROM public.vw_metricas_normalizadas
GROUP BY cliente;

GRANT SELECT ON public.vw_clientes_ativos TO authenticated;
