import type { MetricWriterPort } from "../ports";
import type { NormalizedMetricBatchV1 } from "../types";

/** Stub Fase 2 — escrita real na Fase 6. */
export const metricWriterStub: MetricWriterPort = {
  writerKey: "base_metricas_stub",
  async write(_batch: NormalizedMetricBatchV1) {
    throw new Error("MetricWriter not implemented — Fase 6");
  },
};
