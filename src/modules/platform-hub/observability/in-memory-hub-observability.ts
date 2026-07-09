import type { HubObservabilityPort } from "./ports";
import type { HubSpanRecordV1, HubTraceContext } from "./types";

/** Observabilidade in-memory — spans, tracing e métricas operacionais. */
export class InMemoryHubObservability implements HubObservabilityPort {
  private readonly spans: HubSpanRecordV1[] = [];

  startSpan(name: string, context?: HubTraceContext): { end(): void } {
    const startedAt = new Date().toISOString();
    const record: HubSpanRecordV1 = { name, context, startedAt };
    this.spans.push(record);

    return {
      end: () => {
        const endedAt = new Date().toISOString();
        record.endedAt = endedAt;
        record.durationMs = Date.parse(endedAt) - Date.parse(startedAt);
      },
    };
  }

  snapshot(): readonly HubSpanRecordV1[] {
    return this.spans.map((span) => ({ ...span }));
  }
}
