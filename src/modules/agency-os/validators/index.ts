import { z } from "zod";

const agencyClientStatus = z.enum(["ativo", "implantacao", "negociacao", "pausado", "atencao"]);
const agencyPriority = z.enum(["A", "B", "C", "D"]);
const healthTier = z.enum(["excellent", "good", "attention", "critical"]);

export const agencyCentralFiltersSchema = z.object({
  clienteId: z.number().int().positive().optional(),
  responsavelId: z.string().uuid().optional(),
  status: agencyClientStatus.optional(),
  prioridade: agencyPriority.optional(),
  servico: z.string().min(1).optional(),
  health: healthTier.optional(),
  search: z.string().optional(),
});

export const addNoteSchema = z.object({
  cadastro_cliente_id: z.number().int().positive(),
  body: z.string().min(1).max(5000),
});

export const completeTaskSchema = z.object({
  id: z.string().uuid(),
});

export const moveProjectSchema = z.object({
  id: z.string().uuid(),
  status_kanban: z.enum(["producao", "revisao", "finalizado"]),
  kanban_ordem: z.number().int().min(0),
});

export const moveLeadSchema = z.object({
  id: z.string().uuid(),
  pipeline_stage: z.enum([
    "lead",
    "reuniao",
    "proposta",
    "negociacao",
    "contrato",
    "onboarding",
    "cliente_ativo",
  ]),
  kanban_ordem: z.number().int().min(0),
});

export const convertLeadSchema = z.object({
  leadId: z.string().uuid(),
  cadastroClienteId: z.number().int().positive().optional(),
  nomeCliente: z.string().min(1).optional(),
});

export const agencySearchSchema = z.object({
  query: z.string().min(1).max(120),
});
