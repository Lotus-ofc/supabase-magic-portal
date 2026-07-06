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

export const createLeadSchema = z.object({
  nome: z.string().trim().min(1).max(200),
  empresa: z.string().trim().max(200).optional().nullable(),
  origem: z
    .enum(["indicacao", "inbound", "outbound", "site", "evento", "parceiro", "outro"])
    .optional(),
  valor_estimado: z.number().nonnegative().optional().nullable(),
  proxima_acao: z.string().trim().max(500).optional().nullable(),
  proximo_contato: z.string().datetime().optional().nullable(),
  notas: z.string().trim().max(2000).optional().nullable(),
});

export const createProjectSchema = z.object({
  cadastro_cliente_id: z.number().int().positive(),
  titulo: z.string().trim().min(1).max(200),
  tipo: z.enum(["landing", "site", "sistema", "automacao", "seo", "design", "outro"]).optional(),
  prioridade: agencyPriority.optional(),
  etiqueta: z.string().trim().max(200).optional().nullable(),
  prazo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

export const createTaskSchema = z.object({
  cadastro_cliente_id: z.number().int().positive(),
  titulo: z.string().trim().min(1).max(200),
  descricao: z.string().trim().max(2000).optional().nullable(),
  prioridade: agencyPriority.optional(),
  due_at: z.string().datetime().optional().nullable(),
  agenda_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

export const updateClientOperationalSchema = z.object({
  id: z.number().int().positive(),
  proxima_acao: z.string().trim().max(500).optional().nullable(),
  status_operacional: agencyClientStatus.optional(),
  prioridade: agencyPriority.optional(),
});
