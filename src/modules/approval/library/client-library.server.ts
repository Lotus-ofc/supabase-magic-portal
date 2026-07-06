import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertClientPortalAccess } from "../internal/client-access.server";
import { searchLibrary, getLibraryItemDetail } from "../internal/library-query.server";
import { librarySearchSchema } from "../library/validators/library";

export const searchClientLibraryFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => librarySearchSchema.parse(d))
  .handler(async ({ data, context }) => {
    const clientNames = await assertClientPortalAccess(context);
    return searchLibrary(context.supabase, data, clientNames);
  });

export const getClientLibraryItemFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const clientNames = await assertClientPortalAccess(context);
    const detail = await getLibraryItemDetail(context.supabase, data.id, clientNames);
    if (!detail) throw new Error("Conteúdo não encontrado");
    return detail;
  });
