import type { MetricRowV1 } from "../../../../../../contracts/ingest/profiles/metrics-timeseries.v1";
import type { MetaInsightRowV1 } from "./meta-api.types";

const METRIC_FIELDS = ["impressions", "reach", "clicks", "spend"] as const;

function parseMetricValue(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** Converte linhas Insights (wide) → long format compatível com Make / base_metricas. */
export function mapMetaInsightsToMetricRows(insights: readonly MetaInsightRowV1[]): MetricRowV1[] {
  const rows: MetricRowV1[] = [];

  for (const insight of insights) {
    const date = insight.date_start;
    const campaign = insight.campaign_name ?? insight.campaign_id;

    for (const metricKey of METRIC_FIELDS) {
      const value = parseMetricValue(insight[metricKey]);
      if (value === null) continue;
      rows.push({
        metricKey,
        value,
        date,
        campaign,
      });
    }
  }

  return rows;
}

export function countDistinctCampaigns(insights: readonly MetaInsightRowV1[]): number {
  const campaigns = new Set<string>();
  for (const row of insights) {
    const key = row.campaign_id ?? row.campaign_name;
    if (key) campaigns.add(key);
  }
  return campaigns.size;
}
