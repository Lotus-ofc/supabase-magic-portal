import type { MetricPipelinePort } from "../ports";
import type { IngestEnvelopeV1 } from "../types";

/** Stub Fase 2 — execução real na Fase 6. */
export const metricPipelineStub: MetricPipelinePort = {
  async accept(_envelope: IngestEnvelopeV1) {
    throw new Error("MetricPipeline not implemented — Fase 6");
  },
};
