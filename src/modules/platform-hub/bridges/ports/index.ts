import type { ConnectionId } from "../../connections/types";
import type { ScopeRef } from "../../connections/types";

/** Port do bridge legado — implementação vive em platform-hub-bridges/. */
export interface LegacyCadastroBridgePort {
  registerConnection(connectionId: ConnectionId, scopeRef: ScopeRef): void;
  resolveScopeRef(connectionId: ConnectionId): Promise<ScopeRef>;
  resolveClienteName(scopeRef: ScopeRef): Promise<string>;
}
