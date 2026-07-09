import type { SyncRuntimePort } from "../ports";
import type { SyncJobV1 } from "../types";

/** Stub Fase 2 — implementação real na Fase 6. */
export const syncRuntimeStub: SyncRuntimePort = {
  async enqueue(_job: SyncJobV1) {
    throw new Error("SyncRuntime not implemented — Fase 6");
  },
};
