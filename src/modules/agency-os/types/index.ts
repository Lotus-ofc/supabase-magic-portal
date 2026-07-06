export type AgencyClientStatus = "ativo" | "implantacao" | "negociacao" | "pausado" | "atencao";
export type AgencyPriority = "A" | "B" | "C" | "D";
export type ClientHealthTier = "excellent" | "good" | "attention" | "critical";

export type AgencyTimelineEventType =
  | "client_created"
  | "client_updated"
  | "status_changed"
  | "note_added"
  | "contact_logged"
  | "meeting_scheduled"
  | "task_created"
  | "task_completed"
  | "project_created"
  | "project_moved"
  | "project_completed"
  | "lead_created"
  | "lead_converted"
  | "contract_sent"
  | "contract_signed"
  | "campaign_created"
  | "campaign_paused"
  | "payment_received"
  | "payment_overdue"
  | "report_sent"
  | "landing_published";

export interface AgencyClientCard {
  id: number;
  nome_cliente: string;
  slug: string | null;
  ativo: boolean;
  empresa: string | null;
  valor_mensal: number | null;
  categoria: string | null;
  status_operacional: AgencyClientStatus;
  prioridade: AgencyPriority;
  proxima_acao: string | null;
  responsavel_user_id: string | null;
  ultimo_contato: string | null;
  proxima_reuniao: string | null;
  observacoes: string | null;
  data_inicio: string | null;
  avatar_url: string | null;
  email_principal: string | null;
  telefone: string | null;
  servicos: string[];
  tags: string[];
  health_tier: ClientHealthTier;
}

export interface AgencyExecutiveSummary {
  receita_mensal: number;
  clientes_ativos: number;
  clientes_atencao: number;
  clientes_implantacao: number;
  leads_negociacao: number;
  projetos_andamento: number;
  projetos_atrasados: number;
  campanhas_ativas: number;
  campanhas_pausadas: number;
  leads_quentes: number;
}

export interface AgencyTimelineEvent {
  id: string;
  cadastro_cliente_id: number | null;
  entity_type: string | null;
  entity_id: string | null;
  event_type: AgencyTimelineEventType;
  title: string;
  summary: string | null;
  payload: Record<string, unknown>;
  actor_email: string | null;
  created_at: string;
  cliente_nome?: string | null;
}

export interface MorningBriefing {
  greeting: string;
  lines: string[];
  highlights: MorningBriefingHighlight[];
}

export interface MorningBriefingHighlight {
  id: string;
  text: string;
  filterKey?: string;
  filterValue?: string;
}

export interface ContextualKpi {
  id: string;
  label: string;
  value: string;
  context: string;
  delta?: number | null;
  filterKey?: string;
  filterValue?: string;
}

export interface AgencyCentralFilters {
  clienteId?: number;
  responsavelId?: string;
  status?: AgencyClientStatus;
  prioridade?: AgencyPriority;
  servico?: string;
  health?: ClientHealthTier;
  search?: string;
}
