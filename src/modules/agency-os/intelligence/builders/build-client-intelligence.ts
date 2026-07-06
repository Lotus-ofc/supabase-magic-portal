import type { AgencyClientCard } from "../../types";
import type { AgencyProject, AgencyTask } from "../../types/operations";
import { analyzeClientHealth } from "../health/analyze-health";
import { buildClientInsights } from "../insights/build-insights";
import { buildAgencyRecommendations } from "../recommendations/build-recommendations";
import type { ClientIntelligenceSnapshot, ClientPerformanceSnapshot } from "../types";

export function buildClientIntelligence(input: {
  client: AgencyClientCard;
  tasks: AgencyTask[];
  projects: AgencyProject[];
  performance?: ClientPerformanceSnapshot | null;
}): ClientIntelligenceSnapshot {
  const health = analyzeClientHealth({
    client: input.client,
    tasks: input.tasks,
    projects: input.projects,
  });

  const insights = buildClientInsights({
    client: input.client,
    projects: input.projects,
  });

  const recommendations = buildAgencyRecommendations({
    clients: [input.client],
    leads: [],
    tasks: input.tasks,
    projects: input.projects,
    priorities: [],
  });

  const campaignsSummary = {
    activeChannels: input.client.servicos.filter((s) =>
      ["Google Ads", "Meta Ads", "Social Media", "SEO"].includes(s),
    ),
    pausedCount: 0,
  };

  const financeSummary = {
    mrr: input.client.valor_mensal,
    statusLabel:
      input.client.valor_mensal && input.client.valor_mensal > 0
        ? "MRR ativo"
        : "Sem MRR cadastrado",
  };

  return {
    health,
    insights,
    recommendations: recommendations.slice(0, 5),
    performance: input.performance ?? null,
    financeSummary,
    campaignsSummary,
  };
}
