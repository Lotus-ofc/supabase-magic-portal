import { z } from "zod";

export const librarySearchSchema = z.object({
  q: z.string().trim().max(200).optional(),
  cadastro_cliente_id: z.number().int().positive().optional(),
  pilar_id: z.string().uuid().optional(),
  plataforma: z.string().trim().max(40).optional(),
  formato: z.string().trim().max(80).optional(),
  status: z.enum(["all", "publicado", "arquivado"]).default("all"),
  year: z.number().int().min(2000).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
  tags: z.array(z.string().trim().min(1).max(60)).optional(),
  limit: z.number().int().min(1).max(100).default(24),
  offset: z.number().int().min(0).default(0),
});
