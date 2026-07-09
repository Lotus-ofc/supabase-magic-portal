/**
 * MetricPipelinePort — handler do perfil metrics-timeseries.
 *
 * @implements MetricPipeline class (Fase 2 interface; execução F6)
 * @consumes Sync Runtime (F6), CSV import (futuro)
 * @first-use Fase 2 (interface); execução Fase 6
 */
import type { IngestEnvelopeV1, WriteResultV1 } from "./types";

export interface MetricPipelinePort {
  accept(envelope: IngestEnvelopeV1): Promise<{
    accepted: boolean;
    writerResults: WriteResultV1[];
  }>;
}
