/** Colunas explícitas das tabelas do Plano Estratégico — alinhadas a `types.ts`. */

export const PLANO_ESTRATEGICO_SELECT =
  "id,cadastro_cliente_id,cliente_nome,titulo,descricao,periodo_inicio,periodo_fim,status,objetivo_principal,observacoes,ai_metadata,created_by,created_at,updated_at";

export const PLANO_OBJETIVO_SELECT =
  "id,plano_id,titulo,descricao,meta_numerica,data_alvo,periodo_inicio,workflow_fase,progresso_manual,status,ordem,created_at,updated_at";

export const PLANO_ESTRATEGIA_SELECT =
  "id,plano_id,objetivo_id,titulo,descricao,prioridade,peso_percentual,status,responsavel_email,data_prevista,comentarios,ordem,created_at,updated_at";

export const PLANO_METRIC_REF_SELECT =
  "id,plano_id,objetivo_id,platform_key,metric_key,kpi_key,meta_numerica,positive_is_good,created_at";

export const PLANO_HIPOTESE_SELECT =
  "id,plano_id,objetivo_id,estrategia_id,hipotese,status,resultado_percentual,resultado_texto,conclusao,ordem,created_at,updated_at";

export const PLANO_OPORTUNIDADE_SELECT =
  "id,plano_id,platform_key,insight,acao_sugerida,origem,status,ordem,created_at,updated_at";

export const PLANO_DECISAO_SELECT =
  "id,plano_id,estrategia_id,titulo,motivo,responsavel_email,resultado_texto,resultado_status,data_decisao,created_at,updated_at";

export const PLANO_APRENDIZADO_SELECT =
  "id,plano_id,mes_referencia,titulo,descricao,tags,created_at,updated_at";

export const PLANO_ROADMAP_MARCO_SELECT =
  "id,plano_id,objetivo_id,titulo,descricao,tipo,semana_numero,data_prevista,status,ordem,created_at,updated_at";

export const PLANO_ACAO_SELECT =
  "id,plano_id,estrategia_id,titulo,descricao,motivo_estrategico,responsavel_email,data_prevista,status,sugerido,ordem,created_at,updated_at";

export const PLANO_EVENTO_SELECT =
  "id,plano_id,entity_type,entity_id,tipo,autor_id,autor_email,mensagem,payload,created_at";
