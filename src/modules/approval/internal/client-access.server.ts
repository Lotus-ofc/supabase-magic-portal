import type { SupabaseClient } from "@supabase/supabase-js";
import { isStaffMember } from "./staff-auth.server";

type AuthCtx = {
  supabase: SupabaseClient;
  userId: string;
  claims?: { email?: string | null };
};

/** Escopo do portal cliente — chave canônica: cadastro_cliente_id (mesma do admin). */
export type ClientAccessScope = {
  cadastroClienteIds: number[];
  clientNames: string[];
};

/** Resolve client_access → IDs de cadastro (com fallback por nome). */
export async function getClientAccessScope(
  supabase: SupabaseClient,
  userId: string,
): Promise<ClientAccessScope> {
  const { data, error } = await supabase
    .from("client_access")
    .select("cliente_nome, cadastro_cliente_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const clientNames = [...new Set(rows.map((row) => String(row.cliente_nome)).filter(Boolean))];
  const idSet = new Set<number>();

  for (const row of rows) {
    if (row.cadastro_cliente_id != null) {
      idSet.add(Number(row.cadastro_cliente_id));
    }
  }

  const missingNames = rows
    .filter((row) => row.cadastro_cliente_id == null && row.cliente_nome)
    .map((row) => String(row.cliente_nome));

  if (missingNames.length > 0) {
    const { data: clientes, error: ce } = await supabase
      .from("cadastro_clientes")
      .select("id, nome_cliente")
      .in("nome_cliente", missingNames);
    if (ce) throw new Error(ce.message);
    for (const c of clientes ?? []) {
      idSet.add(Number(c.id));
    }
  }

  return {
    cadastroClienteIds: [...idSet],
    clientNames,
  };
}

/** @deprecated Prefer getClientAccessScope — mantido para compat interna. */
export async function getClientAccessNames(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const scope = await getClientAccessScope(supabase, userId);
  return scope.clientNames;
}

export async function assertClientPortalAccess(ctx: AuthCtx): Promise<ClientAccessScope> {
  const scope = await getClientAccessScope(ctx.supabase, ctx.userId);
  if (scope.cadastroClienteIds.length === 0 && scope.clientNames.length === 0) {
    throw new Error("Forbidden: nenhum cliente vinculado a este usuário");
  }
  return scope;
}

export async function assertCardInClientAccess(
  supabase: SupabaseClient,
  userId: string,
  cadastroClienteId: number,
): Promise<void> {
  const scope = await getClientAccessScope(supabase, userId);
  if (!scope.cadastroClienteIds.includes(cadastroClienteId)) {
    throw new Error("Forbidden: card não pertence aos seus clientes");
  }
}

/** Portal cliente: usuário com client_access (staff sem vínculo usa /admin/aprovacoes). */
export async function resolveClientPortalRole(ctx: AuthCtx): Promise<"cliente" | "staff_redirect"> {
  if (await isStaffMember(ctx)) {
    const scope = await getClientAccessScope(ctx.supabase, ctx.userId);
    if (scope.cadastroClienteIds.length === 0 && scope.clientNames.length === 0) {
      return "staff_redirect";
    }
  }
  await assertClientPortalAccess(ctx);
  return "cliente";
}
