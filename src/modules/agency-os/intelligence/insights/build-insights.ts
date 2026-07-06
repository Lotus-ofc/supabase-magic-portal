import type { AgencyClientCard } from "../../types";
import type { AgencyLead } from "../../types/leads";
import type { AgencyProject } from "../../types/operations";
import type { AgencyInsight } from "../types";
import { daysUntil } from "../../lib/format-time";
import { analyzeClientHealth } from "../health/analyze-health";

export function buildClientInsights(input: {
  client: AgencyClientCard;
  projects: AgencyProject[];
  now?: Date;
}): AgencyInsight[] {
  const now = input.now ?? new Date();
  const insights: AgencyInsight[] = [];
  const { client, projects } = input;

  const health = analyzeClientHealth({ client, projects, now });

  if (health.reasons.some((r) => r.id === "stale_contact")) {
    insights.push({
      id: "no_contact",
      type: "relationship",
      title: "Cliente sem reunião recente",
      description: "Há mais de duas semanas sem contato registrado.",
      severity: "warning",
    });
  }

  const stalled = projects.filter(
    (p) =>
      p.status_kanban === "producao" &&
      p.updated_at &&
      Date.now() - new Date(p.updated_at).getTime() > 7 * 86400000,
  );
  if (stalled.length > 0) {
    insights.push({
      id: "project_stalled",
      type: "delivery",
      title: "Projeto parado",
      description: `${stalled[0]!.titulo} sem movimentação há mais de 7 dias.`,
      severity: "warning",
    });
  }

  const overdue = projects.filter(
    (p) => p.prazo && daysUntil(p.prazo, now) !== null && (daysUntil(p.prazo, now) as number) < 0,
  );
  if (overdue.length > 0) {
    insights.push({
      id: "project_overdue",
      type: "delivery",
      title: "Entrega atrasada",
      description: `${overdue.length} projeto(s) com prazo vencido.`,
      severity: "critical",
    });
  }

  if (client.proxima_reuniao) {
    const days = daysUntil(client.proxima_reuniao, now);
    if (days !== null && days >= 0 && days <= 3) {
      insights.push({
        id: "meeting_soon",
        type: "calendar",
        title: "Reunião próxima",
        description: `Agendada para ${days === 0 ? "hoje" : `em ${days} dia(s)`}.`,
        severity: "info",
      });
    }
  }

  return insights;
}

export function buildLeadInsights(lead: AgencyLead): AgencyInsight[] {
  const insights: AgencyInsight[] = [];
  if (lead.probabilidade_efetiva >= 85) {
    insights.push({
      id: "hot_lead",
      type: "pipeline",
      title: "Lead muito quente",
      description: `Probabilidade de fechamento em ${lead.probabilidade_efetiva}%.`,
      severity: "info",
    });
  }
  if (lead.interacoes_count === 0) {
    insights.push({
      id: "no_interaction",
      type: "pipeline",
      title: "Sem interações registradas",
      description: "Considere primeiro contato.",
      severity: "warning",
    });
  }
  return insights;
}
