-- =========================================================
-- 04_integracoes_make.sql  (aditivo, idempotente)
-- Projeto: ywvhoctcmibjitvwkkhb
--
-- Adiciona colunas técnicas em cadastro_clientes para que os cenários
-- do Make leiam os IDs das plataformas direto do Supabase, sem hardcode.
--
-- Regras: apenas ADD COLUMN IF NOT EXISTS e CREATE OR REPLACE VIEW.
-- NÃO altera base_metricas, views analíticas, RLS, GRANTs ou policies.
-- Todas as colunas são opcionais (text NULL) salvo tiktok_ativo (default false).
-- =========================================================

ALTER TABLE public.cadastro_clientes
  -- Google Ads
  ADD COLUMN IF NOT EXISTS google_ads_customer_id        text,
  -- Meta Ads (Ad Account + Pixel)
  ADD COLUMN IF NOT EXISTS meta_ad_account_id            text,
  ADD COLUMN IF NOT EXISTS meta_pixel_id                 text,
  -- Instagram
  ADD COLUMN IF NOT EXISTS instagram_business_account_id text,
  -- GA4
  ADD COLUMN IF NOT EXISTS ga4_property_id               text,
  -- TikTok Ads
  ADD COLUMN IF NOT EXISTS tiktok_ad_account_id          text,
  ADD COLUMN IF NOT EXISTS tiktok_ativo                  boolean NOT NULL DEFAULT false;

-- Refresh da view administrativa para expor as novas colunas.
CREATE OR REPLACE VIEW public.vw_clientes_admin
WITH (security_invoker = on) AS
SELECT
  cc.id,
  cc.nome_cliente,
  cc.slug,
  cc.ativo,
  cc.empresa,
  cc.email_principal,
  cc.telefone,
  cc.data_inicio,
  cc.valor_mensal,
  cc.mlabs_url,
  cc.observacoes,
  cc.google_ads_ativo,
  cc.meta_ativo,
  cc.ga4_ativo,
  cc.instagram_ativo,
  cc.google_business_ativo,
  cc.tiktok_ativo,
  cc.google_ads_customer_id,
  cc.meta_ad_account_id,
  cc.meta_pixel_id,
  cc.instagram_business_account_id,
  cc.ga4_property_id,
  cc.google_business_location_id,
  cc.tiktok_ad_account_id,
  cc.created_at,
  cc.updated_at,
  COALESCE((
    SELECT array_agg(s.nome ORDER BY s.nome)
    FROM public.cliente_servicos cs
    JOIN public.servicos s ON s.id = cs.servico_id
    WHERE cs.cadastro_cliente_id = cc.id AND cs.ativo = true
  ), ARRAY[]::text[]) AS servicos,
  (SELECT count(*) FROM public.client_access ca
    WHERE ca.cliente_nome = cc.nome_cliente) AS qtd_acessos
FROM public.cadastro_clientes cc;

GRANT SELECT ON public.vw_clientes_admin TO authenticated;
