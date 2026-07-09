import type { LegacyCadastroBridgePort } from "../ports";
import type { ConnectionId, ScopeRef } from "../../connections/types";

/** Stub Fase 2 — use createLegacyCadastroBridge() na Fase 3+. */
export const legacyCadastroBridgeStub: LegacyCadastroBridgePort = {
  registerConnection(_connectionId: ConnectionId, _scopeRef: ScopeRef): void {
    throw new Error("LegacyCadastroBridge not implemented — use createLegacyCadastroBridge()");
  },
  async resolveScopeRef(_connectionId: ConnectionId): Promise<ScopeRef> {
    throw new Error("LegacyCadastroBridge not implemented — use createLegacyCadastroBridge()");
  },
  async resolveClienteName(_scopeRef: ScopeRef) {
    throw new Error("LegacyCadastroBridge not implemented — use createLegacyCadastroBridge()");
  },
};
