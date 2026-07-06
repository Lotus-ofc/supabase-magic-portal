import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  assertStaffAccess,
  resolveApprovalRole,
  getActorEmail,
} from "../internal/staff-auth.server";
import { editorialPillarRepository } from "../repositories/editorial-pillar.repository.server";
import {
  createEditorialPillar,
  updateEditorialPillar,
  archiveEditorialPillar,
  reorderEditorialPillars,
} from "../internal/pillar-lifecycle.server";
import {
  editorialPillarCreateSchema,
  editorialPillarUpdateSchema,
  editorialPillarReorderSchema,
} from "../validators/editorial-pillar";

async function pillarActor(context: {
  supabase: Parameters<typeof assertStaffAccess>[0]["supabase"];
  userId: string;
  claims?: { email?: string | null };
}) {
  await assertStaffAccess(context);
  const role = await resolveApprovalRole(context);
  const email = await getActorEmail(context);
  return { userId: context.userId, email, role };
}

export const listEditorialPillarsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cadastro_cliente_id: z.number().int().positive(),
        include_archived: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaffAccess(context);
    return editorialPillarRepository.listByClient(
      context.supabase,
      data.cadastro_cliente_id,
      !data.include_archived,
    );
  });

export const createEditorialPillarFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => editorialPillarCreateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const actor = await pillarActor(context);
    return createEditorialPillar(context.supabase, actor, data);
  });

export const updateEditorialPillarFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).merge(editorialPillarUpdateSchema).parse(d),
  )
  .handler(async ({ data, context }) => {
    const actor = await pillarActor(context);
    const { id, ...patch } = data;
    return updateEditorialPillar(context.supabase, actor, id, patch);
  });

export const archiveEditorialPillarFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await pillarActor(context);
    return archiveEditorialPillar(context.supabase, actor, data.id);
  });

export const reorderEditorialPillarsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => editorialPillarReorderSchema.parse(d))
  .handler(async ({ data, context }) => {
    const actor = await pillarActor(context);
    return reorderEditorialPillars(
      context.supabase,
      actor,
      data.cadastro_cliente_id,
      data.ordered_ids,
    );
  });
