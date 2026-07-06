import { slugify } from "@/lib/slug";
import type { ClientAccessScope } from "@/modules/approval/internal/client-access.server";
import {
  assertClientPortalAccess,
} from "@/modules/approval/internal/client-access.server";
import { assertStaffAccess } from "@/modules/approval/internal/staff-auth.server";
import type { ClientScopeInput } from "../scope-input";

type AuthCtx = {
  supabase: Parameters<typeof assertClientPortalAccess>[0]["supabase"];
  userId: string;
  claims?: { email?: string | null };
};

/** Resolve ClientScopeInput → ClientAccessScope (mesma forma usada pelo Approval). */
export async function resolvePortalScope(
  ctx: AuthCtx,
  input: ClientScopeInput,
): Promise<ClientAccessScope> {
  if (input.mode === "client_access") {
    return assertClientPortalAccess(ctx);
  }

  await assertStaffAccess(ctx);

  const { data: cad, error } = await ctx.supabase
    .from("cadastro_clientes")
    .select("id, nome_cliente, slug")
    .eq("slug", slugify(input.slug))
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!cad?.id) throw new Error("Cliente não encontrado para o slug informado");

  return {
    cadastroClienteIds: [Number(cad.id)],
    clientNames: [String(cad.nome_cliente)],
  };
}
