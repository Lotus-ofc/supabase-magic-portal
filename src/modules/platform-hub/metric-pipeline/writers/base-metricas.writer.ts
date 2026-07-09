import type { NormalizedMetricBatchV1, WriteResultV1 } from "../metric-batch.types";
import type { MetricWriterPort } from "./metric-writer.port";
export type { BaseMetricasRowV1, BaseMetricasInsertRowV1 } from "./map-to-base-metricas-rows";
export {
  toBaseMetricasRows,
  toBaseMetricasInsertRows,
  toBaseMetricasStorageValue,
} from "./map-to-base-metricas-rows";
export { InMemoryBaseMetricasWriter, BaseMetricasWriter } from "./in-memory-base-metricas.writer";
export { isSupabaseWriterEnabled, resolveWriterMode } from "./writer-config";
export type { WriterMode } from "./writer-config";
export { createMetricWriterRegistry } from "./writer-registry";
export type { CreateMetricWriterRegistryOptions, MetricWriterRegistry } from "./writer-registry";

/** @deprecated Use InMemoryBaseMetricasWriter */
export { InMemoryBaseMetricasWriter as MemoryWriter } from "./in-memory-base-metricas.writer";
