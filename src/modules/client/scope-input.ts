import { z } from "zod";

/** Input de escopo — serializado nas server functions do portal (não altera Approval). */
export const clientScopeInputSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("client_access") }),
  z.object({
    mode: z.literal("slug_context"),
    slug: z.string().trim().min(1).max(200),
  }),
]);

export type ClientScopeInput = z.infer<typeof clientScopeInputSchema>;

export function scopeQueryKeyFromInput(input: ClientScopeInput): string {
  return input.mode === "slug_context" ? `slug:${input.slug}` : "client_access";
}
