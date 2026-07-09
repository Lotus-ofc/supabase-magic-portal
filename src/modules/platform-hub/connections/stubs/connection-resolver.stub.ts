import type { ConnectionResolverPort } from "../ports";
import type { ConnectionId, ScopeRef } from "../types";

/** Stub Fase 2 — implementação real na Fase 3. */
export const connectionResolverStub: ConnectionResolverPort = {
  async resolveCanonicalClientName(_connectionId: ConnectionId): Promise<string> {
    throw new Error("ConnectionResolver not implemented — Fase 3");
  },
  async resolveScopeRef(_connectionId: ConnectionId): Promise<ScopeRef> {
    throw new Error("ConnectionResolver not implemented — Fase 3");
  },
};
