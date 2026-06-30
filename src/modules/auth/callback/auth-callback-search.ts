import { z } from "zod";

export const authCallbackSearchSchema = z.object({
  token_hash: z.string().optional(),
  type: z.string().optional(),
  code: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export type AuthCallbackSearch = z.infer<typeof authCallbackSearchSchema>;
