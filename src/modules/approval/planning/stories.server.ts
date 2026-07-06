import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  assertStaffAccess,
  resolveApprovalRole,
  getActorEmail,
} from "../internal/staff-auth.server";
import { storyPlanRowRepository } from "../repositories/story-plan-row.repository.server";
import {
  createStoryPlanRow,
  updateStoryPlanRow,
  deleteStoryPlanRow,
} from "../internal/story-lifecycle.server";
import { storyPlanRowCreateSchema, storyPlanRowUpdateSchema } from "../validators/story-plan-row";

async function storyActor(context: {
  supabase: Parameters<typeof assertStaffAccess>[0]["supabase"];
  userId: string;
  claims?: { email?: string | null };
}) {
  await assertStaffAccess(context);
  const role = await resolveApprovalRole(context);
  const email = await getActorEmail(context);
  return { userId: context.userId, email, role };
}

export const listStoryPlanRows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cadastro_cliente_id: z.number().int().positive(),
        semana_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaffAccess(context);
    return storyPlanRowRepository.listByClientWeek(
      context.supabase,
      data.cadastro_cliente_id,
      data.semana_inicio,
    );
  });

export const createStoryPlanRowFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => storyPlanRowCreateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const actor = await storyActor(context);
    return createStoryPlanRow(context.supabase, actor, data);
  });

export const updateStoryPlanRowFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).merge(storyPlanRowUpdateSchema).parse(d),
  )
  .handler(async ({ data, context }) => {
    const actor = await storyActor(context);
    const { id, ...patch } = data;
    return updateStoryPlanRow(context.supabase, actor, id, patch);
  });

export const deleteStoryPlanRowFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await storyActor(context);
    await deleteStoryPlanRow(context.supabase, actor, data.id);
    return { ok: true };
  });
