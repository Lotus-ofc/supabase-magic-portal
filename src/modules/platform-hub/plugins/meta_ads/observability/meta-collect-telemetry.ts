import type { HubObservabilityPort } from "@/modules/platform-hub/observability/ports";

export interface MetaCollectTelemetryV1 {
  durationMs: number;
  campaignsCount: number;
  metricsCount: number;
  pagesFetched: number;
  rateLimitHit: boolean;
  error?: string;
}

export interface MetaCollectTelemetrySink {
  record(stats: MetaCollectTelemetryV1): void;
}

export function createMetaCollectTelemetry(
  observability?: HubObservabilityPort,
  sink?: MetaCollectTelemetrySink,
): {
  start(): { finish(stats: Omit<MetaCollectTelemetryV1, "durationMs">): void };
} {
  return {
    start() {
      const startedAt = Date.now();
      const span = observability?.startSpan("meta.metrics.collect");

      return {
        finish(stats) {
          const durationMs = Date.now() - startedAt;
          span?.end();
          sink?.record({ ...stats, durationMs });
        },
      };
    },
  };
}
