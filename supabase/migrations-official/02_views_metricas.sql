-- =========================================================
-- 02_views_metricas.sql  (aditivo, idempotente)
-- Projeto: ywvhoctcmibjitvwkkhb
-- Views com security_invoker=on + filtro por current_user_clientes().
-- Google Ads spend convertido de cost_micros para moeda (/ 1000000).
-- Meta Ads spend permanece em moeda original (a API já retorna assim).
-- =========================================================

-- ---------- Camada base normalizada (long format, plataforma/metrica padronizadas) ----------
CREATE OR REPLACE VIEW public.vw_metricas_normalizadas
WITH (security_invoker = on) AS
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
  -- Conversão Google Ads cost_micros -> moeda
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

-- ---------- Meta Ads (pivot diário) ----------
CREATE OR REPLACE VIEW public.vw_meta_ads_diario
WITH (security_invoker = on) AS
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

-- ---------- Google Ads (pivot + métricas derivadas; spend já convertido) ----------
CREATE OR REPLACE VIEW public.vw_google_ads_diario
WITH (security_invoker = on) AS
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

-- ---------- GA4 (pivot diário) ----------
CREATE OR REPLACE VIEW public.vw_ga4_diario
WITH (security_invoker = on) AS
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

-- ---------- Instagram (pivot diário + engajamento %) ----------
CREATE OR REPLACE VIEW public.vw_instagram_diario
WITH (security_invoker = on) AS
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

-- ---------- Google Business (estrutura pronta para integração futura) ----------
CREATE OR REPLACE VIEW public.vw_google_business_diario
WITH (security_invoker = on) AS
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

-- ---------- Overview consolidado por cliente/dia ----------
CREATE OR REPLACE VIEW public.vw_overview_cliente
WITH (security_invoker = on) AS
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

-- ---------- Clientes ativos (status de ingestão) ----------
CREATE OR REPLACE VIEW public.vw_clientes_ativos
WITH (security_invoker = on) AS
SELECT
  cliente,
  MAX(data)                         AS ultima_data_recebida,
  MAX(created_at)                   AS ultima_ingestao,
  array_agg(DISTINCT plataforma ORDER BY plataforma) AS plataformas_ativas,
  COUNT(*)                          AS total_registros
FROM public.vw_metricas_normalizadas
GROUP BY cliente;

GRANT SELECT ON public.vw_clientes_ativos TO authenticated;
