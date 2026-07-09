import type { LegacyCadastroBridgePort } from "@/modules/platform-hub/bridges/ports";
import type { ConnectionId } from "@/modules/platform-hub/connections/types";
import type { ScopeRef } from "@/modules/platform-hub/connections/types";

/** @deprecated Use createLegacyCadastroBridge() */
export const cadastroClientesBridgeStub: LegacyCadastroBridgePort = {
  registerConnection(_connectionId: ConnectionId, _scopeRef: ScopeRef): void {
    throw new Error("cadastro_clientes bridge not implemented — use createLegacyCadastroBridge()");
  },
  async resolveScopeRef(_connectionId: ConnectionId): Promise<ScopeRef> {
    throw new Error("cadastro_clientes bridge not implemented — use createLegacyCadastroBridge()");
  },
  async resolveClienteName(_scopeRef: ScopeRef) {
    throw new Error("cadastro_clientes bridge not implemented — use createLegacyCadastroBridge()");
  },
};
