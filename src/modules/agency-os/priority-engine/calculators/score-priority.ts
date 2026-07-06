import { daysUntil } from "../../lib/format-time";
import { PRIORITY_SCORE_WEIGHTS } from "../config/weights";
import {
  clientPriorityScore,
  computeDaysOverdueScore,
  computeFinancialImpact,
  computeImpact,
  computeMrrScore,
  computeUrgency,
} from "./score-factors";
import type { OperationalPriority, RawPriorityCandidate } from "../types";

export function scorePriorityCandidate(
  candidate: RawPriorityCandidate,
  now = new Date(),
): OperationalPriority {
  const urgencia = computeUrgency(candidate, now);
  const impacto = computeImpact(candidate);
  const financialImpact = computeFinancialImpact(candidate);
  const daysOverdue = computeDaysOverdueScore(candidate.prazo, now);
  const healthScore = candidate.healthScore;
  const clientPriority = clientPriorityScore(candidate.clientPriority);
  const clientMrr = computeMrrScore(candidate.clientMrr);

  const w = PRIORITY_SCORE_WEIGHTS;
  const scoreFinal = Math.round(
    urgencia * w.urgency +
      impacto * w.impact +
      financialImpact * w.financialImpact +
      daysOverdue * w.daysOverdue +
      healthScore * w.healthScore +
      clientPriority * w.clientPriority +
      clientMrr * w.clientMrr,
  );

  const realDaysAtraso = (() => {
    if (!candidate.prazo) return 0;
    const days = daysUntil(candidate.prazo, now);
    return days !== null && days < 0 ? Math.abs(days) : 0;
  })();

  return {
    id: `${candidate.type}:${candidate.sourceId}`,
    type: candidate.type,
    sourceId: candidate.sourceId,
    clienteId: candidate.clienteId,
    clienteNome: candidate.clienteNome,
    origem: candidate.origem,
    titulo: candidate.titulo,
    descricao: candidate.descricao,
    responsavelUserId: candidate.responsavelUserId,
    responsavelLabel: candidate.responsavelLabel,
    prazo: candidate.prazo,
    peso: scoreFinal,
    urgencia,
    impacto,
    valorRelacionado: candidate.valorRelacionado ?? candidate.clientMrr,
    status: candidate.status,
    healthTier: candidate.healthTier,
    healthScore: candidate.healthScore,
    clientPriority: candidate.clientPriority,
    clientMrr: candidate.clientMrr,
    diasAtraso: realDaysAtraso,
    scoreFinal,
    primaryAction: candidate.primaryAction,
    quickActions: candidate.quickActions ?? [],
    progress: candidate.progress,
    updatedAt: candidate.updatedAt,
  };
}

export function sortPriorities(items: OperationalPriority[]): OperationalPriority[] {
  return [...items].sort((a, b) => b.scoreFinal - a.scoreFinal);
}
