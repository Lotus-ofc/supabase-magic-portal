import { resolveIsAdmin } from "@/lib/owner-admin";

type AuthCtx = {
  supabase: Parameters<typeof resolveIsAdmin>[0]["supabase"];
  userId: string;
  claims?: { email?: string | null };
};

export async function assertAgencyOsAdmin(ctx: AuthCtx) {
  const ok = await resolveIsAdmin({
    supabase: ctx.supabase,
    userId: ctx.userId,
    email: ctx.claims?.email ?? undefined,
    repair: true,
  });
  if (!ok) throw new Error("Forbidden: admin role required");
}

export function actorEmailFromClaims(claims?: { email?: string | null }) {
  return claims?.email ?? null;
}
