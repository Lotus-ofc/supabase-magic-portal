/**
 * Pesos do score de prioridade — única fonte de configuração.
 * Ajuste aqui sem alterar calculators ou strategies.
 */
export const PRIORITY_SCORE_WEIGHTS = {
  urgency: 0.28,
  impact: 0.22,
  financialImpact: 0.18,
  daysOverdue: 0.12,
  healthScore: 0.08,
  clientPriority: 0.07,
  clientMrr: 0.05,
} as const;

export type PriorityScoreWeightKey = keyof typeof PRIORITY_SCORE_WEIGHTS;

/** Urgência base por tipo — complementa cálculo por prazo */
export const PRIORITY_TYPE_URGENCY_BASE: Partial<
  Record<import("./types").OperationalPriorityType, number>
> = {
  payment: 95,
  contract: 85,
  task: 70,
  project: 65,
  meeting: 60,
  lead: 55,
  client_action: 50,
  approval: 75,
  review: 68,
  campaign: 45,
};
