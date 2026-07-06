import type { AgencyLead, AgencyPipelineStage } from "../../types/leads";
import { daysUntil } from "../../lib/format-time";

const ORIGEM_SCORE: Record<AgencyLead["origem"], number> = {
  indicacao: 25,
  inbound: 20,
  parceiro: 18,
  evento: 15,
  site: 12,
  outbound: 8,
  outro: 5,
};

const STAGE_SCORE: Record<AgencyPipelineStage, number> = {
  lead: 15,
  reuniao: 35,
  proposta: 55,
  negociacao: 75,
  contrato: 88,
  onboarding: 92,
  cliente_ativo: 100,
};

export function computeLeadScore(lead: AgencyLead, now = new Date()): number {
  let score = STAGE_SCORE[lead.pipeline_stage] ?? 20;
  score += ORIGEM_SCORE[lead.origem] ?? 5;

  if (lead.valor_estimado) {
    if (lead.valor_estimado >= 10000) score += 15;
    else if (lead.valor_estimado >= 5000) score += 10;
    else if (lead.valor_estimado >= 2000) score += 5;
  }

  score += Math.min(15, lead.reunioes_count * 5);
  score += Math.min(10, lead.interacoes_count * 2);

  if (lead.ultima_interacao) {
    const days = daysUntil(lead.ultima_interacao, now);
    if (days !== null && days < 0) score -= Math.min(25, Math.abs(days) * 3);
    else if (days !== null && days <= 7) score += 5;
  } else {
    score -= 10;
  }

  if (lead.proximo_contato) {
    const days = daysUntil(lead.proximo_contato, now);
    if (days !== null && days <= 1) score += 8;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function effectiveProbability(lead: AgencyLead, now = new Date()): number {
  return lead.probabilidade_manual ?? computeLeadScore(lead, now);
}
