import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertStaffAccess } from "../internal/staff-auth.server";
import { calendarRepository } from "../repositories/calendar.repository.server";
import { groupCardsByDate } from "../services/group-cards-by-date";

const calendarInputSchema = z.object({
  cadastro_cliente_id: z.number().int().positive(),
  view: z.enum(["month", "week", "day"]),
  anchor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const getCalendarCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => calendarInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaffAccess(context);
    const { from, to } = calendarRepository.resolveRange(data.view, data.anchor);
    const cards = await calendarRepository.listByDateRange(context.supabase, {
      cadastroClienteId: data.cadastro_cliente_id,
      from,
      to,
    });
    return {
      view: data.view,
      anchor: data.anchor,
      from,
      to,
      cards,
      byDay: Object.fromEntries(groupCardsByDate(cards)),
    };
  });
