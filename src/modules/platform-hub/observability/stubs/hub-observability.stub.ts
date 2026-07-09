import type { HubObservabilityPort } from "../ports";

/** Stub Fase 2 — implementação real na Fase 6. */
export const hubObservabilityStub: HubObservabilityPort = {
  startSpan(_name, _context) {
    throw new Error("HubObservability not implemented — Fase 6");
  },
};
