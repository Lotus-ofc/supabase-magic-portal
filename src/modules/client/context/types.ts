import type { ClientScopeInput } from "../scope-input";

/** Modo de resolução do escopo do portal cliente. */
export type ClientScopeMode = "client_access" | "slug_context";

/** Escopo resolvido para o portal cliente — Approval recebe apenas cadastro_cliente_id(s). */
export type ClientScope = {
  mode: ClientScopeMode;
  cadastroClienteId: number;
  clienteSlug?: string;
  clienteNome?: string;
  /** Payload enviado às server functions de adaptação. */
  scopeInput: ClientScopeInput;
  /** Chave estável para React Query (evita colisão entre modos). */
  scopeQueryKey: string;
};
