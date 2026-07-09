import type { HubTraceContext } from "../types";

export interface HubObservabilityPort {
  startSpan(name: string, context?: HubTraceContext): { end(): void };
}
