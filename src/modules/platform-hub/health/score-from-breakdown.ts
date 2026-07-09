import type { HealthStatusV1 } from "../types";
import type { HealthEvaluatorContributionV1 } from "../types";

export function scoreFromBreakdown(breakdown: readonly HealthEvaluatorContributionV1[]): number {
  return breakdown.reduce((sum, item) => sum + item.score, 0);
}

export function statusFromScore(score: number, hasSignals: boolean): HealthStatusV1 {
  if (!hasSignals) return "unknown";
  if (score >= 80) return "healthy";
  if (score >= 50) return "degraded";
  return "unhealthy";
}
