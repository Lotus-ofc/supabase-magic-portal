/**
 * Registro do Platform Hub como pillar no Core OS.
 * ADR-0023: sem workers; wiring de EventBus adiado.
 *
 * Não importado em os-bootstrap.ts nesta sprint — isolamento preservado.
 */
const REGISTERED_KEY = Symbol.for("lots.bi.platformHub.registered");

export function registerPlatformHubModule(): void {
  const g = globalThis as typeof globalThis & { [REGISTERED_KEY]?: boolean };
  if (g[REGISTERED_KEY]) return;
  g[REGISTERED_KEY] = true;
  // Reservado: configRegistry, eventBus handlers, rotas admin
}
