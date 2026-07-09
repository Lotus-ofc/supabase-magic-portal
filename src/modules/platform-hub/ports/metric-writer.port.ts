/**
 * MetricWriterPort — único destino de escrita de métricas (v3.3).
 *
 * @implements BaseMetricasWriter (Fase 2)
 * @consumes MetricPipelinePort
 * @first-use Fase 2
 */
import type { NormalizedMetricBatchV1, WriteResultV1 } from "./types";

export interface MetricWriterPort {
  readonly writerKey: string;
  write(batch: NormalizedMetricBatchV1): Promise<WriteResultV1>;
}
