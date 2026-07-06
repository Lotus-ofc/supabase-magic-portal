import type { AgencyExecutiveSummary, AgencyClientCard } from "../../types";
import type { AgencyLead } from "../../types/leads";
import type { OperationalPriority } from "../../priority-engine/types";
import type { AgencyRecommendation, SmartBriefingV2, AgencyPosture } from "../types";
import { averagePortfolioHealth } from "../health/analyze-health";

function firstName(emailOrName?: string | null) {
  if (!emailOrName) return "equipe";
  const base = emailOrName.includes("@") ? emailOrName.split("@")[0] : emailOrName;
  return base.split(/[.\s_-]/)[0] ?? base;
}

function timeGreeting(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function postureFrom(summary: AgencyExecutiveSummary, healthAvg: number): AgencyPosture {
  if (summary.clientes_atencao > 2 || healthAvg < 50) return "critical";
  if (summary.clientes_atencao > 0 || summary.projetos_atrasados > 0 || healthAvg < 65)
    return "attention";
  return "good";
}

const postureLine: Record<AgencyPosture, string> = {
  good: "Hoje sua agência está em boa situação.",
  attention: "Hoje existem pontos que merecem sua atenção.",
  critical: "Hoje sua operação precisa de ação imediata.",
};

export function buildSmartBriefingV2(input: {
  userDisplayName?: string | null;
  summary: AgencyExecutiveSummary;
  clients: AgencyClientCard[];
  priorities: OperationalPriority[];
  leads: AgencyLead[];
  recommendations: AgencyRecommendation[];
  portfolioHealthDeltaPct?: number | null;
  now?: Date;
}): SmartBriefingV2 {
  const now = input.now ?? new Date();
  const healthAvg = averagePortfolioHealth(input.clients, now);
  const posture = postureFrom(input.summary, healthAvg);
  const greeting = `${timeGreeting(now.getHours())}, ${firstName(input.userDisplayName)}`;

  const narrativeLines: string[] = [postureLine[posture]];

  const topPriority = input.priorities[0];
  if (topPriority) {
    const reason =
      topPriority.diasAtraso > 0
        ? `porque ${topPriority.titulo.toLowerCase()} está atrasado`
        : `porque ${topPriority.titulo.toLowerCase()} vence em breve`;
    narrativeLines.push(`${topPriority.clienteNome} precisa de atenção ${reason}.`);
  }

  const hotLead = [...input.leads]
    .filter((l) => l.pipeline_stage !== "cliente_ativo")
    .sort((a, b) => b.probabilidade_efetiva - a.probabilidade_efetiva)[0];
  if (hotLead && hotLead.probabilidade_efetiva >= 70) {
    narrativeLines.push(
      `${hotLead.nome} é sua maior oportunidade desta semana (${hotLead.probabilidade_efetiva}% de fechamento).`,
    );
  }

  const topRec = input.recommendations[0];
  if (topRec && !narrativeLines.some((l) => l.includes(topRec.title))) {
    narrativeLines.push(topRec.description);
  }

  if (input.summary.projetos_atrasados > 0) {
    narrativeLines.push(
      `${input.summary.projetos_atrasados} projeto${input.summary.projetos_atrasados > 1 ? "s" : ""} em atraso na produção.`,
    );
  }

  if (input.portfolioHealthDeltaPct != null && input.portfolioHealthDeltaPct !== 0) {
    const dir = input.portfolioHealthDeltaPct > 0 ? "aumentou" : "caiu";
    narrativeLines.push(
      `Seu Health médio da carteira ${dir} ${Math.abs(input.portfolioHealthDeltaPct)}%.`,
    );
  }

  const curated = narrativeLines.slice(0, 5);

  return {
    greeting,
    lines: curated,
    narrativeLines: curated,
    highlights: [],
    posture,
    portfolioHealthAvg: healthAvg,
    portfolioHealthDeltaPct: input.portfolioHealthDeltaPct ?? null,
  };
}
