import type { AgencyClientCard, ClientHealthTier } from "../types";

export interface HealthFactorContext {
  client: AgencyClientCard;
  now?: Date;
}

export interface HealthFactor {
  id: string;
  weight: number;
  evaluate: (ctx: HealthFactorContext) => number;
}

/** Score 0 = crítico, 100 = excelente. Fatores plugáveis — novos sinais sem alterar o motor. */
export const HEALTH_FACTORS: HealthFactor[] = [
  {
    id: "operational_status",
    weight: 0.35,
    evaluate({ client }) {
      switch (client.status_operacional) {
        case "ativo":
          return 100;
        case "implantacao":
        case "negociacao":
          return 70;
        case "pausado":
          return 40;
        case "atencao":
          return 15;
        default:
          return 50;
      }
    },
  },
  {
    id: "contact_recency",
    weight: 0.25,
    evaluate({ client, now = new Date() }) {
      if (!client.ultimo_contato) return 20;
      const days = Math.floor(
        (now.getTime() - new Date(client.ultimo_contato).getTime()) / 86400000,
      );
      if (days <= 7) return 100;
      if (days <= 14) return 70;
      if (days <= 30) return 40;
      return 10;
    },
  },
  {
    id: "priority",
    weight: 0.15,
    evaluate({ client }) {
      switch (client.prioridade) {
        case "A":
          return 100;
        case "B":
          return 80;
        case "C":
          return 60;
        case "D":
          return 40;
        default:
          return 50;
      }
    },
  },
  {
    id: "mrr",
    weight: 0.15,
    evaluate({ client }) {
      if (!client.valor_mensal || client.valor_mensal <= 0) return 30;
      if (client.valor_mensal >= 5000) return 100;
      if (client.valor_mensal >= 2000) return 80;
      return 60;
    },
  },
  {
    id: "services",
    weight: 0.1,
    evaluate({ client }) {
      if (client.servicos.length === 0) return 40;
      if (client.servicos.length >= 3) return 100;
      return 70;
    },
  },
];

export function computeHealthScore(
  client: AgencyClientCard,
  factors: HealthFactor[] = HEALTH_FACTORS,
  now = new Date(),
): number {
  if (!client.ativo) return 0;

  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const weighted = factors.reduce(
    (sum, f) => sum + f.evaluate({ client, now }) * f.weight,
    0,
  );
  return Math.round(weighted / totalWeight);
}

export function scoreToTier(score: number): ClientHealthTier {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "attention";
  return "critical";
}

/** Compat Fase 1 — retorno mínimo { score, tier } */
export function computeClientHealth(client: AgencyClientCard, now = new Date()) {
  const score = computeHealthScore(client, HEALTH_FACTORS, now);
  return { score, tier: scoreToTier(score) };
}
