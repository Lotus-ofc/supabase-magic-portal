import type { ContentCardEvent } from "../../types/content-card-event";
import type { ContentCardStatus } from "../../types/content-card";
import { computeStageDurations, type StageDuration } from "../../services/compute-stage-durations";
import type { StageAverageMs, WorkflowMetricsFramework } from "../types/dashboard";

const STAGE_LABELS: Record<string, string> = {
  "start->producao": "Início → Produção",
  "producao->edicao": "Produção → Edição",
  "producao->aguardando_aprovacao": "Produção → Aguardando aprovação",
  "producao->aprovado": "Produção → Aprovado",
  "edicao->aguardando_aprovacao": "Edição → Aguardando aprovação",
  "aguardando_aprovacao->aprovado": "Aprovação → Aprovado",
  "aprovado->publicado": "Aprovado → Publicado",
  "publicado->arquivado": "Publicado → Arquivado",
};

function stageKey(d: StageDuration): string {
  return `${d.fromStatus}->${d.toStatus}`;
}

export function aggregateStageAverages(
  eventsByCard: Map<string, ContentCardEvent[]>,
): StageAverageMs[] {
  const buckets = new Map<string, number[]>();

  for (const events of eventsByCard.values()) {
    for (const d of computeStageDurations(events)) {
      const key = stageKey(d);
      const list = buckets.get(key) ?? [];
      list.push(d.durationMs);
      buckets.set(key, list);
    }
  }

  const order: string[] = [
    "start->producao",
    "producao->edicao",
    "producao->aguardando_aprovacao",
    "producao->aprovado",
    "edicao->aguardando_aprovacao",
    "aguardando_aprovacao->aprovado",
    "aprovado->publicado",
    "publicado->arquivado",
  ];

  return order.map((key) => {
    const samples = buckets.get(key) ?? [];
    const averageMs =
      samples.length > 0 ? samples.reduce((a, b) => a + b, 0) / samples.length : null;
    return {
      stageKey: key,
      label: STAGE_LABELS[key] ?? key,
      averageMs,
      sampleSize: samples.length,
    };
  });
}

export function formatDurationMs(ms: number | null): string {
  if (ms == null) return "—";
  const hours = ms / (1000 * 60 * 60);
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export const WORKFLOW_METRICS_FRAMEWORK: WorkflowMetricsFramework = {
  sla: {
    enabled: false,
    description: "SLA por etapa — estrutura reservada para Fase 5+",
  },
  leadTime: {
    enabled: false,
    description: "Lead time (criação → publicação) — derivável de content_card_events",
  },
  cycleTime: {
    enabled: false,
    description: "Cycle time por status — derivável de content_card_events",
  },
  collaboratorAvg: {
    enabled: false,
    description: "Tempo médio por colaborador — derivável de actor_email nos eventos",
  },
};

export function countByStatusValue(
  byStatus: { status: ContentCardStatus; count: number }[],
  status: ContentCardStatus,
): number {
  return byStatus.find((r) => r.status === status)?.count ?? 0;
}
