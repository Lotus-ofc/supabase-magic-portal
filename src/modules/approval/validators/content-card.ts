import { z } from "zod";
import { CONTENT_CARD_STATUSES } from "../types/content-card";

export const checklistItemSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(1).max(200),
  done: z.boolean(),
});

export const contentCardCreateSchema = z.object({
  cadastro_cliente_id: z.number().int().positive(),
  data_publicacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hora_publicacao: z.string().optional().nullable(),
  titulo: z.string().trim().min(1).max(200),
  legenda: z.string().trim().max(5000).optional().nullable(),
  copy_text: z.string().trim().max(10000).optional().nullable(),
  roteiro: z.string().trim().max(10000).optional().nullable(),
  direcao_arte: z.string().trim().max(5000).optional().nullable(),
  cta: z.string().trim().max(500).optional().nullable(),
  plataforma: z.string().trim().max(40).default("instagram"),
  formato: z.string().trim().max(40).optional().nullable(),
  capa_url: z.string().url().max(500).optional().nullable(),
  status: z.enum(CONTENT_CARD_STATUSES).default("producao"),
  checklist: z.array(checklistItemSchema).default([]),
  pilar_id: z.string().uuid({ message: "Pilar editorial obrigatório" }),
  estrategia_id: z.string().uuid().optional().nullable(),
  responsavel_user_id: z.string().uuid().optional().nullable(),
  responsavel_email: z.string().email().max(200).optional().nullable(),
  kanban_ordem: z.number().int().min(0).default(0),
});

export const contentCardUpdateSchema = contentCardCreateSchema
  .partial()
  .omit({ cadastro_cliente_id: true });

export const contentCardMoveSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(CONTENT_CARD_STATUSES),
  kanban_ordem: z.number().int().min(0),
});
