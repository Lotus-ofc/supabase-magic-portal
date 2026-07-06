import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  assertClientPortalAccess,
  resolveClientPortalRole,
} from "../internal/client-access.server";
import { getClientKanbanBoard, getClientCardDetail } from "../internal/client-query.server";
import {
  clientApproveCard,
  clientCommentCard,
  clientRequestChanges,
} from "../internal/client-lifecycle.server";
import { listCardAttachmentsWithUrls } from "../internal/attachment-lifecycle.server";
import { getActorEmail } from "../internal/staff-auth.server";
import { contentCardCommentSchema } from "../validators/content-card-event";

async function clientActor(context: {
  supabase: Parameters<typeof assertClientPortalAccess>[0];
  userId: string;
  claims?: { email?: string | null };
}) {
  const clientNames = await assertClientPortalAccess(context);
  const email = await getActorEmail(context);
  return {
    userId: context.userId,
    email,
    role: "cliente" as const,
    clientNames,
  };
}

export const checkClientPortalAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await resolveClientPortalRole(context);
    return { role };
  });

export const getClientKanbanBoardFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { clientNames } = await clientActor(context);
    return getClientKanbanBoard(context.supabase, clientNames);
  });

export const getClientContentCard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { clientNames } = await clientActor(context);
    const detail = await getClientCardDetail(context.supabase, data.id, clientNames);
    if (!detail) throw new Error("Card não encontrado");
    return detail;
  });

export const clientCommentCardFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => contentCardCommentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const actor = await clientActor(context);
    await clientCommentCard(context.supabase, actor, data);
    return { ok: true };
  });

export const clientApproveCardFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        card_id: z.string().uuid(),
        mensagem: z.string().trim().max(2000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const actor = await clientActor(context);
    await clientApproveCard(context.supabase, actor, data);
    return { ok: true };
  });

export const clientRequestChangesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => contentCardCommentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const actor = await clientActor(context);
    await clientRequestChanges(context.supabase, actor, data);
    return { ok: true };
  });

export const listClientCardMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ cardId: z.string().uuid(), capaUrl: z.string().nullable().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { clientNames } = await clientActor(context);
    const card = await getClientCardDetail(context.supabase, data.cardId, clientNames);
    if (!card) throw new Error("Card não encontrado");
    const media = await listCardAttachmentsWithUrls(
      context.supabase,
      data.cardId,
      data.capaUrl ?? card.card.capa_url,
    );
    return { media };
  });
