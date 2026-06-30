import { describe, expect, it } from "vitest";
import { deriveOportunidadesRegra } from "@/lib/strategic-plan/oportunidades";
import type { PeriodAggregates } from "@/lib/platforms/engine";

function agg(
  currentKpis: Record<string, number>,
  previousKpis: Record<string, number>,
  current: Record<string, number> = {},
  previous: Record<string, number> = {},
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

describe("deriveOportunidadesRegra", () => {
  it("sugere escalar investimento quando CTR sobe", () => {
    const regras = deriveOportunidadesRegra({
      google_ads: agg({ ctr: 6 }, { ctr: 5 }),
    });
    expect(regras.some((r) => r.acao_sugerida === "Escalar investimento")).toBe(true);
  });

  it("sugere SEO quando taxa de conversão GA4 melhora", () => {
    const regras = deriveOportunidadesRegra({
      ga4: agg({}, {}, { conversions: 20, sessions: 100 }, { conversions: 10, sessions: 100 }),
    });
    expect(regras.some((r) => r.acao_sugerida.includes("SEO"))).toBe(true);
  });
});
