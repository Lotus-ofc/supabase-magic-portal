import { isPlatformOwnerEmail } from "@/lib/platform-owner";
import type { ApprovalRole } from "../types/approval-role";

type AuthCtx = {
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown }> };
  userId: string;
  claims?: { email?: string | null };
};

async function hasRole(ctx: AuthCtx, role: string): Promise<boolean> {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: role });
  return !!data;
}

export async function isStaffMember(ctx: AuthCtx): Promise<boolean> {
  if (isPlatformOwnerEmail(ctx.claims?.email ?? undefined)) return true;
  if (await hasRole(ctx, "admin")) return true;
  return hasRole(ctx, "social_media");
}

export async function assertStaffAccess(ctx: AuthCtx): Promise<void> {
  if (!(await isStaffMember(ctx))) {
    throw new Error("Forbidden: staff role required (admin or social_media)");
  }
}

export async function resolveApprovalRole(ctx: AuthCtx): Promise<ApprovalRole> {
  if (isPlatformOwnerEmail(ctx.claims?.email ?? undefined)) return "admin";
  if (await hasRole(ctx, "admin")) return "admin";
  if (await hasRole(ctx, "social_media")) return "social_media";
  return "cliente";
}

export async function getActorEmail(ctx: AuthCtx): Promise<string | null> {
  return ctx.claims?.email ?? null;
}
