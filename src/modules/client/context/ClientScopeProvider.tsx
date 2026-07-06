import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { ClientScope, ClientScopeMode } from "./types";
import { scopeQueryKeyFromInput, type ClientScopeInput } from "../scope-input";

const ClientScopeContext = createContext<ClientScope | null>(null);

type ClientScopeProviderProps = {
  mode: ClientScopeMode;
  /** Obrigatório em slug_context. */
  clienteSlug?: string;
  cadastroClienteId?: number;
  clienteNome?: string;
  children: ReactNode;
};

export function ClientScopeProvider({
  mode,
  clienteSlug,
  cadastroClienteId = 0,
  clienteNome,
  children,
}: ClientScopeProviderProps) {
  const value = useMemo((): ClientScope => {
    const scopeInput: ClientScopeInput =
      mode === "slug_context"
        ? { mode: "slug_context", slug: clienteSlug ?? "" }
        : { mode: "client_access" };

    return {
      mode,
      cadastroClienteId,
      clienteSlug,
      clienteNome,
      scopeInput,
      scopeQueryKey: scopeQueryKeyFromInput(scopeInput),
    };
  }, [mode, clienteSlug, cadastroClienteId, clienteNome]);

  return <ClientScopeContext.Provider value={value}>{children}</ClientScopeContext.Provider>;
}

export function useClientScope(): ClientScope {
  const ctx = useContext(ClientScopeContext);
  if (!ctx) {
    throw new Error("useClientScope deve ser usado dentro de ClientScopeProvider");
  }
  return ctx;
}

/** Retorna null fora do portal com escopo (ex.: admin workspace). */
export function useOptionalClientScope(): ClientScope | null {
  return useContext(ClientScopeContext);
}
