import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  assertStaffAccess,
  resolveApprovalRole,
  getActorEmail,
} from "../internal/staff-auth.server";
import { searchLibrary, getLibraryItemDetail } from "../internal/library-query.server";
import { archiveLibraryContent } from "../internal/library-lifecycle.server";
import { librarySearchSchema } from "../library/validators/library";

async function libraryActor(context: {
  supabase: Parameters<typeof assertStaffAccess>[0]["supabase"];
  userId: string;
  claims?: { email?: string | null };
}) {
  await assertStaffAccess(context);
  const role = await resolveApprovalRole(context);
  const email = await getActorEmail(context);
  return { userId: context.userId, email, role };
}

export const searchLibraryFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => librarySearchSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaffAccess(context);
    return searchLibrary(context.supabase, data);
  });

export const getLibraryItemFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaffAccess(context);
    const detail = await getLibraryItemDetail(context.supabase, data.id);
    if (!detail) throw new Error("Conteúdo não encontrado na Biblioteca");
    return detail;
  });

export const archiveLibraryItemFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await libraryActor(context);
    return archiveLibraryContent(context.supabase, actor, data.id);
  });
