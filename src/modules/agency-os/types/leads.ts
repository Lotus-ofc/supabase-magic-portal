export type AgencyPipelineStage =
  | "lead"
  | "reuniao"
  | "proposta"
  | "negociacao"
  | "contrato"
  | "onboarding"
  | "cliente_ativo";

export type AgencyLeadOrigem =
  | "indicacao"
  | "inbound"
  | "outbound"
  | "site"
  | "evento"
  | "parceiro"
  | "outro";

export interface AgencyLead {
  id: string;
  nome: string;
  empresa: string | null;
  origem: AgencyLeadOrigem;
  valor_estimado: number | null;
  probabilidade_manual: number | null;
  probabilidade_score: number;
  probabilidade_efetiva: number;
  proximo_contato: string | null;
  proxima_acao: string | null;
  ultima_interacao: string | null;
  responsavel_user_id: string | null;
  pipeline_stage: AgencyPipelineStage;
  cadastro_cliente_id: number | null;
  kanban_ordem: number;
  reunioes_count: number;
  interacoes_count: number;
  notas: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineKanbanBoard {
  columns: {
    id: AgencyPipelineStage;
    label: string;
    items: AgencyLead[];
  }[];
}

export const PIPELINE_COLUMNS: { id: AgencyPipelineStage; label: string }[] = [
  { id: "lead", label: "Lead" },
  { id: "reuniao", label: "Reunião" },
  { id: "proposta", label: "Proposta" },
  { id: "negociacao", label: "Negociação" },
  { id: "contrato", label: "Contrato" },
  { id: "onboarding", label: "Onboarding" },
];
