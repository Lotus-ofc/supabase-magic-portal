import { isPlatformOwnerEmail } from "@/lib/platform-owner";

type SupabaseRpc = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

/**
 * Dono da plataforma é sempre admin — independente de user_roles.
 * Com migration 09, has_role() no Postgres já retorna true; esta função
 * cobre a camada de aplicação antes da migration rodar.
 */
export function ownerHasAdminAccess(email: string | null | undefined): boolean {
  return isPlatformOwnerEmail(email);
}

/** Garante linha admin em user_roles (service-role). Idempotente. */
export async function repairOwnerAdminRole(userId: string, email: string | null | undefined): Promise<void> {
  if (!ownerHasAdminAccess(email)) return;

  try {
    const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
    const supabaseAdmin = getSupabaseAdmin();

    const { error: rpcError } = await supabaseAdmin.rpc("ensure_owner_admin_for_user", {
      _user_id: userId,
    });
    if (!rpcError) return;

    const { error: insertError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: "admin",
    });

    if (insertError && !/duplicate key|unique constraint/i.test(insertError.message)) {
      console.warn("[owner-admin] repair failed:", insertError.message);
    }
  } catch (err) {
    console.warn("[owner-admin] repair skipped (no service role?):", err);
  }
}

/** has_role RPC + fallback para dono da plataforma. */
export async function resolveIsAdmin(args: {
  supabase: SupabaseRpc;
  userId: string;
  email: string | null | undefined;
  repair?: boolean;
}): Promise<boolean> {
  const { supabase, userId, email, repair = true } = args;

  if (ownerHasAdminAccess(email)) {
    if (repair) await repairOwnerAdminRole(userId, email);
    return true;
  }

  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  return !!data;
}
