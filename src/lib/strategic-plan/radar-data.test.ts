import { describe, expect, it } from "vitest";
import { buildRadarAxes, barFill } from "@/lib/strategic-plan/radar-data";

describe("buildRadarAxes", () => {
  it("normaliza eixos a partir de progresso de KPIs", () => {
    const axes = buildRadarAxes({
      metricProgress: [
        {
          ref: {
            id: "r1",
            plano_id: "p1",
            objetivo_id: null,
            platform_key: "google_ads",
            metric_key: "spend",
            kpi_key: null,
            meta_numerica: 100,
            positive_is_good: true,
            created_at: "",
          },
          label: "Investimento",
          platformLabel: "Google Ads",
          current: 80,
          meta: 100,
          pct: 80,
          delta: null,
          onTrack: true,
        },
      ],
      estrategias: [],
    });
    expect(axes.some((a) => a.label === "Google Ads" && a.value === 80)).toBe(true);
  });

  it("barFill renderiza blocos proporcionais", () => {
    expect(barFill(100, 7)).toBe("███████");
    expect(barFill(0, 7)).toBe("░░░░░░░");
  });
});
