/**
 * @contract ScopeRef v1.0.0
 * @see contracts/connection/contract.meta.json
 *
 * Tipo opaco de escopo organizacional. Somente ConnectionResolver e
 * platform-hub-bridges/legacy-cadastro conhecem o mapeamento.
 * Persistência interna pode usar coluna scope_ref ou tenant_id (Fase 2).
 */

export type ScopeRef = string & { readonly __brand: "ScopeRef" };

export const SCOPE_REF_CONTRACT_VERSION = "1.0.0" as const;

export function asScopeRef(value: string): ScopeRef {
  return value as ScopeRef;
}
