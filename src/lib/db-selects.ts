/** Colunas explícitas para reduzir payload — espelham views/tabelas usadas no app.
 *  VW_CLIENTES_ADMIN_SELECT e CADASTRO_CLIENTES_SELECT exigem migration 05 aplicada.
 *  Queries de clientes usam select("*") até a migration estar em todos os ambientes. */

export const VW_CLIENTES_ADMIN_SELECT =
  "id,nome_cliente,slug,ativo,empresa,email_principal,telefone,data_inicio,valor_mensal,mlabs_url,observacoes,google_ads_ativo,meta_ativo,ga4_ativo,instagram_ativo,google_business_ativo,tiktok_ativo,instagram_username,instagram_page_id,facebook_ad_account_id,google_ads_customer_id,ga4_property_id,google_business_location_id,tiktok_ad_account_id,created_at,updated_at,servicos,qtd_acessos";

export const VW_CLIENTES_ATIVOS_SELECT =
  "cliente,ultima_data_recebida,ultima_ingestao,plataformas_ativas,total_registros";

export const CADASTRO_CLIENTES_SELECT =
  "id,nome_cliente,slug,ativo,empresa,email_principal,telefone,observacoes,google_ads_ativo,meta_ativo,ga4_ativo,instagram_ativo,google_business_ativo,tiktok_ativo,google_ads_customer_id,facebook_ad_account_id,instagram_username,instagram_page_id,ga4_property_id,google_business_location_id,tiktok_ad_account_id,mlabs_url,data_inicio,valor_mensal,created_at,updated_at";

export const SERVICOS_SELECT = "id,nome,descricao,ativo,created_at";

/** Amostra mínima para painel de debug (preview de views diárias). */
export const DEBUG_DAILY_VIEW_SAMPLE_SELECT = "data,cliente";

export const ESTRATEGIA_EDITORIAL_STATS_SELECT = "estrategia_id,status,total";
