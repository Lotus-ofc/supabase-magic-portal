import type { AgencyClientCard, AgencyExecutiveSummary } from "../../types";
import type { AgencyLead } from "../../types/leads";
import type { AgencyProject, AgencyTask } from "../../types/operations";
import type { AgencyTimelineEvent } from "../../types";
import { buildOperationalPriorities } from "../../priority-engine/builders/build-priorities";
import { buildAgencyRecommendations } from "../recommendations/build-recommendations";
import { buildSmartBriefingV2 } from "../briefing/build-smart-briefing";
import { rankFeedEvents } from "../feed/rank-feed";
import { averagePortfolioHealth } from "../health/analyze-health";
import type { AgencyIntelligenceSnapshot } from "../types";

export function buildAgencyIntelligence(input: {
  userDisplayName?: string | null;
  summary: AgencyExecutiveSummary;
  clients: AgencyClientCard[];
  tasks: AgencyTask[];
  projects: AgencyProject[];
  leads: AgencyLead[];
  feedEvents: AgencyTimelineEvent[];
  previousPortfolioHealthAvg?: number | null;
  now?: Date;
}): AgencyIntelligenceSnapshot {
  const now = input.now ?? new Date();
  const priorities = buildOperationalPriorities({
    tasks: input.tasks,
    projects: input.projects,
    clients: input.clients,
    now,
  });

  const recommendations = buildAgencyRecommendations({
    clients: input.clients,
    leads: input.leads,
    tasks: input.tasks,
    projects: input.projects,
    priorities: priorities.all,
    now,
  });

  const portfolioHealthAvg = averagePortfolioHealth(input.clients, now);
  const portfolioHealthDeltaPct =
    input.previousPortfolioHealthAvg != null && input.previousPortfolioHealthAvg > 0
      ? Math.round(
          ((portfolioHealthAvg - input.previousPortfolioHealthAvg) /
            input.previousPortfolioHealthAvg) *
            100,
        )
      : null;

  const briefing = buildSmartBriefingV2({
    userDisplayName: input.userDisplayName,
    summary: input.summary,
    clients: input.clients,
    priorities: priorities.today,
    leads: input.leads,
    recommendations,
    portfolioHealthDeltaPct,
    now,
  });

  const globalFeed = rankFeedEvents(input.feedEvents, 20);

  return {
    briefing,
    globalFeed,
    recommendations,
    portfolioHealthAvg,
    portfolioHealthDeltaPct,
  };
}
