-- =========================================================
-- 05_cadastro_clientes_make_ids.sql  (aditivo, idempotente)
-- Projeto: ywvhoctcmibjitvwkkhb
--
-- Adiciona em cadastro_clientes os identificadores técnicos consumidos
-- pelos cenários do Make + handle do Instagram, eliminando a dependência
-- do Google Sheets como fonte de IDs.
--
-- Regras:
--   * ADD COLUMN IF NOT EXISTS na tabela.
--   * DROP + CREATE na view (CREATE OR REPLACE falha ao inserir colunas
--     no meio da lista — Postgres interpreta como rename de coluna).
--   * Nenhuma coluna existente é removida ou renomeada.
--
-- IMPORTANTE: substitui e deprecia a tentativa anterior (04_integracoes_make.sql)
-- que usava nomes diferentes e nunca foi aplicada ao banco.
-- =========================================================

ALTER TABLE public.cadastro_clientes
  -- Instagram
  ADD COLUMN IF NOT EXISTS instagram_username     text,
  ADD COLUMN IF NOT EXISTS instagram_page_id      text,
  -- Meta / Facebook Ads
  ADD COLUMN IF NOT EXISTS facebook_ad_account_id text,
  -- Google Ads
  ADD COLUMN IF NOT EXISTS google_ads_customer_id text,
  -- GA4
  ADD COLUMN IF NOT EXISTS ga4_property_id        text,
  -- TikTok Ads (opcional)
  ADD COLUMN IF NOT EXISTS tiktok_ad_account_id   text,
  ADD COLUMN IF NOT EXISTS tiktok_ativo           boolean NOT NULL DEFAULT false;

-- Recria a view (não usar CREATE OR REPLACE ao expandir colunas no meio).
DROP VIEW IF EXISTS public.vw_clientes_admin;

CREATE VIEW public.vw_clientes_admin
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
  cc.google_business_location_id,
  cc.tiktok_ativo,
  cc.instagram_username,
  cc.instagram_page_id,
  cc.facebook_ad_account_id,
  cc.google_ads_customer_id,
  cc.ga4_property_id,
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
