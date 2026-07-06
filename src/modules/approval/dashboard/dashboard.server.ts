import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertStaffAccess } from "../internal/staff-auth.server";
import { getOpsDashboard } from "../internal/dashboard-query.server";

export const getApprovalOpsDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ cadastro_cliente_id: z.number().int().positive().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaffAccess(context);
    return getOpsDashboard(
      context.supabase,
      data.cadastro_cliente_id != null
        ? { cadastroClienteId: data.cadastro_cliente_id }
        : undefined,
    );
  });
