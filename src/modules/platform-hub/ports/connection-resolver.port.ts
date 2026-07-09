/**
 * ConnectionResolverPort — resolve ConnectionId para dados internos (privado ao Hub).
 *
 * @implements ConnectionResolver (Fase 2)
 * @consumes MetricPipeline (F6), Legacy Bridge (F2)
 * @first-use Fase 2
 *
 * Runtime e API pública usam apenas ConnectionId — nunca ScopeRef nem tenant.
 */
import type { ConnectionId, ScopeRef } from "./types";

export interface ConnectionResolverPort {
  resolveCanonicalClientName(connectionId: ConnectionId): Promise<string>;
  /** Uso interno — bridge legado e persistência. Não expor na API pública. */
  resolveScopeRef(connectionId: ConnectionId): Promise<ScopeRef>;
}
