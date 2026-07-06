import type { SupabaseClient } from "@supabase/supabase-js";
import { isStaffMember } from "./staff-auth.server";

type AuthCtx = {
  supabase: SupabaseClient;
  userId: string;
  claims?: { email?: string | null };
};

/** Nomes de clientes via client_access — nunca confia em parâmetros da UI. */
export async function getClientAccessNames(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("client_access")
    .select("cliente_nome")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const names = (data ?? []).map((row) => String(row.cliente_nome));
  return [...new Set(names)];
}

export async function assertClientPortalAccess(ctx: AuthCtx): Promise<string[]> {
  const names = await getClientAccessNames(ctx.supabase, ctx.userId);
  if (names.length === 0) {
    throw new Error("Forbidden: nenhum cliente vinculado a este usuário");
  }
  return names;
}

export async function assertCardInClientAccess(
  supabase: SupabaseClient,
  userId: string,
  clienteNome: string,
): Promise<void> {
  const names = await getClientAccessNames(supabase, userId);
  if (!names.includes(clienteNome)) {
    throw new Error("Forbidden: card não pertence aos seus clientes");
  }
}

/** Portal cliente: usuário com client_access (staff sem vínculo usa /admin/aprovacoes). */
export async function resolveClientPortalRole(ctx: AuthCtx): Promise<"cliente" | "staff_redirect"> {
  if (await isStaffMember(ctx)) {
    const names = await getClientAccessNames(ctx.supabase, ctx.userId);
    if (names.length === 0) return "staff_redirect";
  }
  await assertClientPortalAccess(ctx);
  return "cliente";
}
