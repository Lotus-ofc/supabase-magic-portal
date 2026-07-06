import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertClientPortalAccess } from "../internal/client-access.server";
import { editorialPillarRepository } from "../repositories/editorial-pillar.repository.server";
import { calendarRepository } from "../repositories/calendar.repository.server";
import { storyPlanRowRepository } from "../repositories/story-plan-row.repository.server";
import { groupCardsByDate } from "../services/group-cards-by-date";

export const listClientEditorialPillars = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const clientNames = await assertClientPortalAccess(context);
    return editorialPillarRepository.listForClientNames(context.supabase, clientNames, true);
  });

export const getClientCalendarCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        view: z.enum(["month", "week", "day"]),
        anchor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const clientNames = await assertClientPortalAccess(context);
    const { from, to } = calendarRepository.resolveRange(data.view, data.anchor);
    const cards = await calendarRepository.listForClientNamesByDateRange(
      context.supabase,
      clientNames,
      from,
      to,
    );
    return {
      view: data.view,
      anchor: data.anchor,
      from,
      to,
      cards,
      byDay: Object.fromEntries(groupCardsByDate(cards)),
    };
  });

export const listClientStoryPlanRows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ semana_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const clientNames = await assertClientPortalAccess(context);
    return storyPlanRowRepository.listForClientNames(
      context.supabase,
      clientNames,
      data.semana_inicio,
    );
  });
