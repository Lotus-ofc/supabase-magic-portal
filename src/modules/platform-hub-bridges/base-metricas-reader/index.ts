export type { BaselineMetricRowV1, BaselineReadFilterV1, BaselineReadResultV1 } from "./types";

export type { BaselineReaderPort, BaselineMetricasQueryPort } from "./ports/baseline-reader.port";

export { BaselineReader, createBaselineReader } from "./baseline-reader";
export type { BaselineReaderOptions } from "./baseline-reader";

export { SupabaseBaselineMetricasQuery } from "./supabase-reader";
export { InMemoryBaselineMetricasQuery } from "./in-memory-baseline-query";

export {
  baselineRowKey,
  fromWriterSnapshot,
  fromBaseMetricasDbRow,
  metricAliasCanonical,
  platformAliasCanonical,
  normalizeCampaign,
  METRIC_ALIAS_GROUPS,
  PLATFORM_ALIAS_GROUPS,
} from "./mapping";

export { compareMetrics } from "./comparison-service";
export type {
  ComparisonReportV1,
  CompareMetricsOptions,
  MetricValueDifferenceV1,
  NormalizationDifferenceV1,
} from "./comparison-service";

export { compareAgainstBaseline } from "./parity";
export type { ParityComparisonInput } from "./parity";
