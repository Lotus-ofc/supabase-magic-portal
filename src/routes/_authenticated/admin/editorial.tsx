import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

const editorialRedirectSearch = z.object({
  estrategia: z.string().uuid().optional(),
});

/** Redirect permanente — `/admin/editorial` → `/admin/aprovacoes` (Fase 5). */
export const Route = createFileRoute("/_authenticated/admin/editorial")({
  validateSearch: editorialRedirectSearch,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/admin/aprovacoes",
      search: {
        tab: "calendar",
        ...(search.estrategia ? { estrategia: search.estrategia } : {}),
      },
      replace: true,
    });
  },
});
