import type { LegacyCadastroBridgePort } from "@/modules/platform-hub/bridges/ports";
import type { ConnectionId } from "@/modules/platform-hub/connections/types";
import type { ScopeRef } from "@/modules/platform-hub/connections/types";
import {
  registerCadastroRecord,
  resolveCanonicalNameFromScope,
  resolveScopeRefFromConnection,
  registerConnectionScope,
} from "./in-memory-cadastro.registry";

/** Única implementação autorizada a conhecer cadastro_clientes (Fase 3+ — in-memory). */
export class LegacyCadastroBridge implements LegacyCadastroBridgePort {
  registerConnection(connectionId: ConnectionId, scopeRef: ScopeRef): void {
    registerConnectionScope(connectionId, scopeRef);
  }

  async resolveScopeRef(connectionId: ConnectionId): Promise<ScopeRef> {
    return resolveScopeRefFromConnection(connectionId);
  }

  async resolveClienteName(scopeRef: ScopeRef): Promise<string> {
    return resolveCanonicalNameFromScope(scopeRef);
  }

  registerCadastro(input: { cadastroId: number; nomeCanonico: string; tenantId?: string }): void {
    registerCadastroRecord(input);
  }
}

export function createLegacyCadastroBridge(): LegacyCadastroBridge {
  return new LegacyCadastroBridge();
}
