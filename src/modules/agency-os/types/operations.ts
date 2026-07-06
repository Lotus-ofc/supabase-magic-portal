export type AgencyProjectType =
  | "landing"
  | "site"
  | "sistema"
  | "automacao"
  | "seo"
  | "design"
  | "outro";

export type AgencyProjectStatus = "producao" | "revisao" | "finalizado";
export type AgencyTaskStatus = "open" | "completed" | "cancelled";

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface AgencyTask {
  id: string;
  cadastro_cliente_id: number;
  titulo: string;
  descricao: string | null;
  prioridade: import("./index").AgencyPriority;
  due_at: string | null;
  agenda_date: string | null;
  responsavel_user_id: string | null;
  status: AgencyTaskStatus;
  completed_at: string | null;
  completed_on_date: string | null;
  created_at: string;
  updated_at: string;
  cliente_nome?: string;
}

export interface AgencyProject {
  id: string;
  cadastro_cliente_id: number;
  titulo: string;
  tipo: AgencyProjectType;
  status_kanban: AgencyProjectStatus;
  prioridade: import("./index").AgencyPriority;
  etiqueta: string | null;
  prazo: string | null;
  responsavel_user_id: string | null;
  checklist: ChecklistItem[];
  kanban_ordem: number;
  created_at: string;
  updated_at: string;
  cliente_nome?: string;
  cliente_health_tier?: import("./index").ClientHealthTier;
}

export interface AgencyNote {
  id: string;
  cadastro_cliente_id: number;
  body: string;
  author_user_id: string | null;
  author_email: string | null;
  created_at: string;
}

export interface ProductionKanbanBoard {
  columns: {
    id: AgencyProjectStatus;
    label: string;
    items: AgencyProject[];
  }[];
}
