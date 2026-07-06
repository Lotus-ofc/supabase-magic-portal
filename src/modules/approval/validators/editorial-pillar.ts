import { z } from "zod";

export const editorialPillarCreateSchema = z.object({
  cadastro_cliente_id: z.number().int().positive(),
  titulo: z.string().trim().min(1).max(120),
  objetivo: z.string().trim().max(2000).optional().nullable(),
  explicacao: z.string().trim().max(5000).optional().nullable(),
  cor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#6366f1"),
  ordem: z.number().int().min(0).default(0),
  ativo: z.boolean().default(true),
});

export const editorialPillarUpdateSchema = editorialPillarCreateSchema
  .partial()
  .omit({ cadastro_cliente_id: true });

export const editorialPillarReorderSchema = z.object({
  cadastro_cliente_id: z.number().int().positive(),
  ordered_ids: z.array(z.string().uuid()).min(1),
});
