import type { ConnectionResolverPort } from "./ports";
import type { LegacyCadastroBridgePort } from "../bridges/ports";
import type { ConnectionId, ScopeRef } from "./types";

/** Resolvedor fino — ConnectionId → Bridge → ScopeRef. Sem lógica de negócio. */
export class ConnectionResolver implements ConnectionResolverPort {
  constructor(private readonly bridge: LegacyCadastroBridgePort) {}

  async resolveScopeRef(connectionId: ConnectionId): Promise<ScopeRef> {
    return this.bridge.resolveScopeRef(connectionId);
  }

  async resolveCanonicalClientName(connectionId: ConnectionId): Promise<string> {
    const scopeRef = await this.resolveScopeRef(connectionId);
    return this.bridge.resolveClienteName(scopeRef);
  }

  async resolve(
    connectionId: ConnectionId,
  ): Promise<{ connectionId: ConnectionId; scopeRef: ScopeRef }> {
    const scopeRef = await this.resolveScopeRef(connectionId);
    return { connectionId, scopeRef };
  }
}
