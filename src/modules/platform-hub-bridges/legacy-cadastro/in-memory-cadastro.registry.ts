import { asConnectionId } from "../../../../contracts/connection/connection-id.v1";
import { asScopeRef } from "../../../../contracts/connection/scope-ref.v1";
import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { ScopeRef } from "../../../../contracts/connection/scope-ref.v1";

/**
 * Simula cadastro_clientes + aliases + tenant — somente neste módulo (Fase 3+ in-memory).
 * Substituição por Supabase em fase posterior.
 */
interface CadastroRecord {
  cadastroId: number;
  nomeCanonico: string;
  tenantId: string;
}

const CADASTRO_BY_ID = new Map<number, CadastroRecord>([
  [42, { cadastroId: 42, nomeCanonico: "acme_corp", tenantId: "tenant-demo" }],
]);

/** Registro operacional (Gate A / staging) — fora do kernel. */
export function registerCadastroRecord(input: {
  cadastroId: number;
  nomeCanonico: string;
  tenantId?: string;
}): void {
  CADASTRO_BY_ID.set(input.cadastroId, {
    cadastroId: input.cadastroId,
    nomeCanonico: input.nomeCanonico.trim(),
    tenantId: input.tenantId ?? `tenant-cadastro-${input.cadastroId}`,
  });
}

const CONNECTION_TO_SCOPE = new Map<string, ScopeRef>([
  [asConnectionId("00000000-0000-4000-8000-000000000001"), asScopeRef("cadastro:42")],
]);

export function registerConnectionScope(connectionId: ConnectionId, scopeRef: ScopeRef): void {
  CONNECTION_TO_SCOPE.set(connectionId, scopeRef);
}

export function resolveScopeRefFromConnection(connectionId: ConnectionId): ScopeRef {
  const scopeRef = CONNECTION_TO_SCOPE.get(connectionId);
  if (!scopeRef) {
    throw new Error(`Connection not found: ${connectionId}`);
  }
  return scopeRef;
}

export function resolveCanonicalNameFromScope(scopeRef: ScopeRef): string {
  const match = /^cadastro:(\d+)$/.exec(scopeRef);
  if (!match) {
    throw new Error(`Invalid ScopeRef: ${scopeRef}`);
  }
  const record = CADASTRO_BY_ID.get(Number(match[1]));
  if (!record) {
    throw new Error(`Cadastro not found for ScopeRef: ${scopeRef}`);
  }
  return record.nomeCanonico;
}
