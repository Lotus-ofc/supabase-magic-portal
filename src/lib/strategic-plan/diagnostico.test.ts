import { describe, expect, it } from "vitest";
import { buildDiagnostico } from "@/lib/strategic-plan/diagnostico";
import type { PeriodAggregates } from "@/lib/platforms/engine";

function agg(
  current: Record<string, number>,
  previous: Record<string, number>,
  currentKpis: Record<string, number> = {},
  previousKpis: Record<string, number> = {},
): PeriodAggregates {
  return {
    current,
    previous,
    currentKpis,
    previousKpis,
    daily: [],
    campaigns: [],
    lastSync: null,
  };
}

describe("buildDiagnostico", () => {
  it("detecta investimento aumentando no Google Ads", () => {
    const insights = buildDiagnostico({
      google_ads: agg(
        { spend: 110, clicks: 10, impressions: 100 },
        { spend: 100, clicks: 10, impressions: 100 },
      ),
    });
    expect(insights.some((i) => i.narrative === "Investimento aumentando")).toBe(true);
  });

  it("detecta CTR caindo no Google Ads", () => {
    const insights = buildDiagnostico({
      google_ads: agg(
        { spend: 100, clicks: 8, impressions: 200 },
        { spend: 100, clicks: 10, impressions: 200 },
        { ctr: 4 },
        { ctr: 5 },
      ),
    });
    expect(insights.some((i) => i.narrative === "CTR caindo")).toBe(true);
  });

  it("detecta Instagram perdendo engajamento", () => {
    const insights = buildDiagnostico({
      instagram: agg(
        { reach: 100, likes: 10 },
        { reach: 100, likes: 20 },
        { engagement_rate: 8 },
        { engagement_rate: 12 },
      ),
    });
    expect(insights.some((i) => i.narrative === "Instagram perdendo engajamento")).toBe(true);
  });
});
