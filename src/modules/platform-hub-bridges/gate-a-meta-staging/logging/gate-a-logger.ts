import type { GateAStepLogV1 } from "../types";

export interface GateALogger {
  step(step: string, detail?: Record<string, unknown>): void;
  complete(step: string, detail?: Record<string, unknown>): void;
  fail(step: string, error: unknown, detail?: Record<string, unknown>): void;
  snapshot(): GateAStepLogV1[];
}

export function createGateALogger(onLine?: (line: string) => void): GateALogger {
  const steps: GateAStepLogV1[] = [];
  const startedAt = new Map<string, number>();

  function emit(payload: GateAStepLogV1): void {
    steps.push(payload);
    const line = JSON.stringify(payload);
    onLine?.(line);
  }

  return {
    step(step, detail) {
      startedAt.set(step, Date.now());
      emit({ step, status: "started", at: new Date().toISOString(), detail });
    },
    complete(step, detail) {
      const start = startedAt.get(step);
      emit({
        step,
        status: "completed",
        at: new Date().toISOString(),
        durationMs: start !== undefined ? Date.now() - start : undefined,
        detail,
      });
    },
    fail(step, error, detail) {
      const start = startedAt.get(step);
      emit({
        step,
        status: "failed",
        at: new Date().toISOString(),
        durationMs: start !== undefined ? Date.now() - start : undefined,
        detail,
        error: error instanceof Error ? error.message : String(error),
      });
    },
    snapshot() {
      return [...steps];
    },
  };
}
