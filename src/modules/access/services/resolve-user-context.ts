import { isPlatformOwnerEmail } from "@/lib/platform-owner";

/** Resolve se o usuário autenticado é admin (app layer). */
export async function resolveUserIsAdmin(email: string | undefined | null): Promise<boolean> {
  if (isPlatformOwnerEmail(email)) return true;
  try {
    const { checkIsAdmin } = await import("@/lib/admin.functions");
    const result = await checkIsAdmin();
    return !!result?.isAdmin;
  } catch {
    return false;
  }
}
