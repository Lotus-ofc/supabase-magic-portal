import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { agencyOsServerSearch } from "@/modules/agency-os/register-with-core";
import "@/modules/os-bootstrap";

export const searchOs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ query: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    return agencyOsServerSearch(context.supabase, data.query);
  });
