import type { AgencyClientCard } from "../../types";
import type { AgencyProject, AgencyTask } from "../../types/operations";
import {
  computeHealthScore,
  scoreToTier,
  HEALTH_FACTORS,
} from "../../services/compute-client-health";
import { daysUntil } from "../../lib/format-time";
import type { ClientHealthDiagnosis, HealthReason, HealthRecommendation } from "../types";

export interface HealthAnalysisContext {
  client: AgencyClientCard;
  tasks?: AgencyTask[];
  projects?: AgencyProject[];
  now?: Date;
}

function contactDays(client: AgencyClientCard, now: Date) {
  if (!client.ultimo_contato) return null;
  return Math.floor((now.getTime() - new Date(client.ultimo_contato).getTime()) / 86400000);
}

export function analyzeClientHealth(ctx: HealthAnalysisContext): ClientHealthDiagnosis {
  const now = ctx.now ?? new Date();
  const { client } = ctx;
  const score = computeHealthScore(client, HEALTH_FACTORS, now);
  const tier = scoreToTier(score);
  const reasons: HealthReason[] = [];
  const recommendations: HealthRecommendation[] = [];

  const days = contactDays(client, now);
  if (days === null) {
    reasons.push({ id: "no_contact", label: "Sem registro de contato", impact: "negative" });
    recommendations.push({
      id: "schedule_contact",
      label: "Registrar ou agendar contato",
      actionType: "contact",
      priority: "high",
    });
  } else if (days > 14) {
    reasons.push({ id: "stale_contact", label: `Sem contato há ${days} dias`, impact: "negative" });
    recommendations.push({
      id: "follow_up",
      label: "Agendar reunião nesta semana",
      actionType: "meeting",
      priority: "high",
    });
  } else {
    reasons.push({ id: "recent_contact", label: "Contato recente", impact: "positive" });
  }

  const overdueTasks =
    ctx.tasks?.filter(
      (t) =>
        t.status === "open" &&
        t.due_at &&
        daysUntil(t.due_at, now) !== null &&
        (daysUntil(t.due_at, now) as number) < 0,
    ) ?? [];
  if (overdueTasks.length > 0) {
    reasons.push({
      id: "overdue_tasks",
      label: `${overdueTasks.length} tarefa${overdueTasks.length > 1 ? "s" : ""} atrasada${overdueTasks.length > 1 ? "s" : ""}`,
      impact: "negative",
    });
  }

  const overdueProjects =
    ctx.projects?.filter(
      (p) =>
        p.status_kanban !== "finalizado" &&
        p.prazo &&
        daysUntil(p.prazo, now) !== null &&
        (daysUntil(p.prazo, now) as number) < 0,
    ) ?? [];
  if (overdueProjects.length > 0) {
    reasons.push({
      id: "overdue_projects",
      label: `${overdueProjects.length} projeto${overdueProjects.length > 1 ? "s" : ""} atrasado${overdueProjects.length > 1 ? "s" : ""}`,
      impact: "negative",
    });
    recommendations.push({
      id: "review_project",
      label: "Revisar entregas atrasadas",
      actionType: "project",
      priority: "high",
    });
  }

  if (client.status_operacional === "ativo") {
    reasons.push({ id: "active_status", label: "Cliente ativo", impact: "positive" });
  }
  if (client.status_operacional === "atencao") {
    reasons.push({ id: "attention_status", label: "Marcado para atenção", impact: "negative" });
  }

  const hasActivePlatforms =
    client.servicos.some((s) =>
      ["Google Ads", "Meta Ads", "Social Media"].some((k) => s.includes(k)),
    );
  if (hasActivePlatforms) {
    reasons.push({ id: "campaigns_active", label: "Serviços de mídia contratados", impact: "positive" });
  }

  if (client.valor_mensal && client.valor_mensal > 0) {
    reasons.push({ id: "mrr_ok", label: "Pagamento recorrente ativo", impact: "positive" });
  }

  const suggestedNextAction =
    recommendations[0]?.label ??
    client.proxima_acao ??
    (tier === "excellent" ? "Manter ritmo de acompanhamento" : "Revisar prioridades do cliente");

  return { score, tier, reasons, recommendations, suggestedNextAction };
}

export function averagePortfolioHealth(clients: AgencyClientCard[], now = new Date()) {
  const active = clients.filter((c) => c.ativo);
  if (active.length === 0) return 0;
  const sum = active.reduce((acc, c) => acc + computeHealthScore(c, HEALTH_FACTORS, now), 0);
  return Math.round(sum / active.length);
}
