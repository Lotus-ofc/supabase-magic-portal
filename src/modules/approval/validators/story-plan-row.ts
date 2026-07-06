import { z } from "zod";
import { checklistItemSchema } from "./content-card";

export const storyPlanRowCreateSchema = z.object({
  cadastro_cliente_id: z.number().int().positive(),
  semana_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dia_semana: z.number().int().min(0).max(6),
  periodo: z.string().trim().max(40).optional().nullable(),
  titulo: z.string().trim().max(200).optional().nullable(),
  observacoes: z.string().trim().max(2000).optional().nullable(),
  checklist: z.array(checklistItemSchema).default([]),
  ordem: z.number().int().min(0).default(0),
  card_id: z.string().uuid().optional().nullable(),
});

export const storyPlanRowUpdateSchema = storyPlanRowCreateSchema
  .partial()
  .omit({ cadastro_cliente_id: true, semana_inicio: true });
