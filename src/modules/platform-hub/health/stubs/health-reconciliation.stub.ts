import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { HealthReconciliationPort } from "../ports";

/** Stub Fase 2 — implementação real na Fase 5. */
export const healthReconciliationStub: HealthReconciliationPort = {
  async reconcile(_connectionId: ConnectionId) {
    throw new Error("HealthReconciliation not implemented — Fase 5");
  },
};
