import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Calendar,
  ClipboardCheck,
  FileText,
  Flame,
  FolderKanban,
  Megaphone,
  Target,
  UserCircle,
  Wrench,
} from "lucide-react";
import type { OperationalPriorityType } from "../types";

export const PRIORITY_TYPE_META: Record<
  OperationalPriorityType,
  { label: string; icon: LucideIcon; tone: string }
> = {
  task: { label: "Tarefa", icon: ClipboardCheck, tone: "text-primary" },
  project: { label: "Projeto", icon: FolderKanban, tone: "text-info" },
  contract: { label: "Contrato", icon: FileText, tone: "text-warning" },
  payment: { label: "Pagamento", icon: Banknote, tone: "text-danger" },
  meeting: { label: "Reunião", icon: Calendar, tone: "text-primary" },
  lead: { label: "Lead", icon: Target, tone: "text-info" },
  campaign: { label: "Campanha", icon: Megaphone, tone: "text-muted-foreground" },
  approval: { label: "Aprovação", icon: ClipboardCheck, tone: "text-warning" },
  review: { label: "Revisão", icon: Wrench, tone: "text-warning" },
  client_action: { label: "Cliente", icon: UserCircle, tone: "text-foreground" },
};

export function priorityHeatIcon(score: number): LucideIcon {
  if (score >= 80) return Flame;
  return PRIORITY_TYPE_META.task.icon;
}
