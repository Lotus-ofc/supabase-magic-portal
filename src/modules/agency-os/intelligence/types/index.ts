import type { ClientHealthTier, MorningBriefing } from "../../types";
import type { AgencyTimelineEvent } from "../../types";

export type AgencyPosture = "good" | "attention" | "critical";

export interface SmartBriefingV2 extends MorningBriefing {
  posture: AgencyPosture;
  /** Linhas curadas — máximo relevância, sem spam */
  narrativeLines: string[];
  portfolioHealthAvg: number;
  portfolioHealthDeltaPct: number | null;
}

export interface HealthReason {
  id: string;
  label: string;
  impact: "positive" | "negative" | "neutral";
}

export interface HealthRecommendation {
  id: string;
  label: string;
  actionType: string;
  priority: "high" | "medium" | "low";
}

export interface ClientHealthDiagnosis {
  score: number;
  tier: ClientHealthTier;
  reasons: HealthReason[];
  recommendations: HealthRecommendation[];
  suggestedNextAction: string | null;
}

export interface AgencyRecommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  clienteId?: number;
  clienteNome?: string;
  leadId?: string;
  actionHref?: string;
  actionLabel: string;
  priority: number;
}

export interface AgencyInsight {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
}

export interface RankedFeedItem {
  event: AgencyTimelineEvent;
  importance: number;
  critical: boolean;
}

export interface AgencyIntelligenceSnapshot {
  briefing: SmartBriefingV2;
  globalFeed: RankedFeedItem[];
  recommendations: AgencyRecommendation[];
  portfolioHealthAvg: number;
  portfolioHealthDeltaPct: number | null;
}

export interface ClientIntelligenceSnapshot {
  health: ClientHealthDiagnosis;
  insights: AgencyInsight[];
  recommendations: AgencyRecommendation[];
  performance: ClientPerformanceSnapshot | null;
  financeSummary: ClientFinanceSummary | null;
  campaignsSummary: ClientCampaignsSummary | null;
}

export interface ClientPerformanceSnapshot {
  spend30d: number;
  leads30d: number;
  sessions30d: number;
  trendLabel: string | null;
}

export interface ClientFinanceSummary {
  mrr: number | null;
  statusLabel: string;
}

export interface ClientCampaignsSummary {
  activeChannels: string[];
  pausedCount: number;
}
