import type { AgencyPriority, ClientHealthTier } from "../../types";

export type OperationalPriorityType =
  | "task"
  | "project"
  | "contract"
  | "payment"
  | "meeting"
  | "lead"
  | "campaign"
  | "approval"
  | "review"
  | "client_action";

export type OperationalPriorityStatus = "open" | "in_progress" | "blocked" | "done";

export interface OperationalPriority {
  id: string;
  type: OperationalPriorityType;
  sourceId: string;
  clienteId: number;
  clienteNome: string;
  origem: string;
  titulo: string;
  descricao: string | null;
  responsavelUserId: string | null;
  responsavelLabel: string | null;
  prazo: string | null;
  peso: number;
  urgencia: number;
  impacto: number;
  valorRelacionado: number | null;
  status: OperationalPriorityStatus;
  healthTier: ClientHealthTier;
  healthScore: number;
  clientPriority: AgencyPriority;
  clientMrr: number | null;
  diasAtraso: number;
  scoreFinal: number;
  primaryAction: PriorityAction;
  quickActions: PriorityAction[];
  progress?: number;
  updatedAt: string | null;
}

export interface PriorityAction {
  id: string;
  label: string;
  variant?: "default" | "primary" | "ghost";
}

export interface RawPriorityCandidate {
  type: OperationalPriorityType;
  sourceId: string;
  clienteId: number;
  clienteNome: string;
  origem: string;
  titulo: string;
  descricao: string | null;
  responsavelUserId: string | null;
  responsavelLabel: string | null;
  prazo: string | null;
  status: OperationalPriorityStatus;
  healthTier: ClientHealthTier;
  healthScore: number;
  clientPriority: AgencyPriority;
  clientMrr: number | null;
  valorRelacionado: number | null;
  progress?: number;
  updatedAt: string | null;
  primaryAction: PriorityAction;
  quickActions?: PriorityAction[];
}

export interface PriorityBuildContext {
  now: Date;
}
