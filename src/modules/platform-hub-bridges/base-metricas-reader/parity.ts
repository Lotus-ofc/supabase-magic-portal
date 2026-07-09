import type { BaselineReaderPort } from "./ports/baseline-reader.port";
import type { BaselineMetricRowV1, BaselineReadFilterV1 } from "./types";
import { fromWriterSnapshot } from "./mapping";
import {
  compareMetrics,
  type CompareMetricsOptions,
  type ComparisonReportV1,
} from "./comparison-service";
import type { BaseMetricasRowV1 } from "@/modules/platform-hub/metric-pipeline/writers/map-to-base-metricas-rows";

export interface ParityComparisonInput {
  baselineReader: BaselineReaderPort;
  filter: BaselineReadFilterV1;
  /** Snapshot do MemoryWriter / MetricPipeline output. */
  produced: readonly BaseMetricasRowV1[] | readonly BaselineMetricRowV1[];
  options?: CompareMetricsOptions;
}

/**
 * Orquestra: Baseline Reader → compareMetrics → ComparisonReport.
 * Critério de sucesso da sprint de paridade.
 */
export async function compareAgainstBaseline(
  input: ParityComparisonInput,
): Promise<ComparisonReportV1> {
  const baseline = await input.baselineReader.read(input.filter);
  const produced = fromWriterSnapshot(input.produced as readonly BaseMetricasRowV1[]);
  return compareMetrics(baseline.rows, produced, input.options);
}
