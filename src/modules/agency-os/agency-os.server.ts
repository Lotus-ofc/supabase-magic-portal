import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildCommandContext,
  dispatchCommand,
} from "@/modules/core/server/dispatch-command.server";
import "@/modules/os-bootstrap";
import { assertAgencyOsAdmin, actorEmailFromClaims } from "./internal/assert-admin.server";
import { agencyClientRepository } from "./repositories/client.repository.server";
import { agencySummaryRepository } from "./repositories/summary.repository.server";
import { agencyTimelineRepository } from "./repositories/timeline.repository.server";
import { agencyTaskRepository } from "./repositories/task.repository.server";
import { agencyProjectRepository } from "./repositories/project.repository.server";
import { agencyNoteRepository } from "./repositories/note.repository.server";
import { agencyLeadRepository } from "./repositories/lead.repository.server";
import { buildContextualKpis, buildMorningBriefing } from "./services/build-morning-briefing";
import { buildOperationalPriorities } from "./priority-engine/builders/build-priorities";
import { buildAgencyIntelligence } from "./intelligence/builders/build-agency-intelligence";
import { buildClientIntelligence } from "./intelligence/builders/build-client-intelligence";
import { fetchClientPerformance } from "./intelligence/services/fetch-client-performance";
import { searchAgencyOs } from "./intelligence/services/search-agency-os";
import { AGENCY_COMMANDS, dispatchAgencyCommand } from "./commands/register-commands";
import {
  addNoteSchema,
  agencyCentralFiltersSchema,
  agencySearchSchema,
  completeTaskSchema,
  convertLeadSchema,
  createLeadSchema,
  createProjectSchema,
  createTaskSchema,
  moveLeadSchema,
  moveProjectSchema,
  updateClientOperationalSchema,
} from "./validators";

export const getAgencyCentral = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => agencyCentralFiltersSchema.optional().parse(d ?? {}))
  .handler(async ({ data: filters, context }) => {
    await assertAgencyOsAdmin(context);

    const [summary, clients, feed, tasks, projects, leads] = await Promise.all([
      agencySummaryRepository.getExecutiveSummary(context.supabase),
      agencyClientRepository.list(context.supabase, filters ?? {}),
      agencyTimelineRepository.listRecent(context.supabase, 30),
      agencyTaskRepository.listOpen(context.supabase),
      agencyProjectRepository.listActive(context.supabase),
      agencyLeadRepository.listActive(context.supabase),
    ]);

    const email = actorEmailFromClaims(context.claims);
    const briefing = buildMorningBriefing({
      userDisplayName: email,
      summary,
      clients,
    });
    const kpis = buildContextualKpis(summary, { pipelineLeads: leads.length });

    const intelligence = buildAgencyIntelligence({
      userDisplayName: email,
      summary,
      clients,
      tasks,
      projects,
      leads,
      feedEvents: feed,
    });

    return {
      summary,
      clients,
      briefing,
      kpis,
      feed,
      intelligence,
    };
  });

export const getAgencyPriorities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAgencyOsAdmin(context);

    const [tasks, projects, clients] = await Promise.all([
      agencyTaskRepository.listOpen(context.supabase),
      agencyProjectRepository.listActive(context.supabase),
      agencyClientRepository.list(context.supabase),
    ]);

    return buildOperationalPriorities({ tasks, projects, clients });
  });

export const getProductionKanban = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAgencyOsAdmin(context);
    const board = await agencyProjectRepository.buildKanbanBoard(context.supabase);
    const clients = await agencyClientRepository.list(context.supabase);
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    return {
      columns: board.columns.map((col) => ({
        ...col,
        items: col.items.map((item) => ({
          ...item,
          cliente_nome: clientMap.get(item.cadastro_cliente_id)?.nome_cliente,
          cliente_health_tier: clientMap.get(item.cadastro_cliente_id)?.health_tier,
        })),
      })),
    };
  });

export const moveAgencyProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => moveProjectSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const cmdCtx = buildCommandContext({
      userId: context.userId,
      actorEmail: actorEmailFromClaims(context.claims),
      supabase: context.supabase,
      source: "moveAgencyProject",
    });
    const result = await dispatchAgencyCommand("moveProject", cmdCtx, data);
    if (!result.ok) throw new Error(result.error);
    return { ok: true as const };
  });

export const completeAgencyTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => completeTaskSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const cmdCtx = buildCommandContext({
      userId: context.userId,
      actorEmail: actorEmailFromClaims(context.claims),
      supabase: context.supabase,
      source: "completeAgencyTask",
    });
    const result = await dispatchAgencyCommand("completeTask", cmdCtx, data);
    if (!result.ok) throw new Error(result.error);
    return { ok: true as const };
  });

export const addAgencyNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => addNoteSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const cmdCtx = buildCommandContext({
      userId: context.userId,
      actorEmail: actorEmailFromClaims(context.claims),
      supabase: context.supabase,
      source: "addAgencyNote",
    });
    const result = await dispatchAgencyCommand("createNote", cmdCtx, data);
    if (!result.ok) throw new Error(result.error);
    return { ok: true as const };
  });

export const getAgencyClient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.number().int().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const client = await agencyClientRepository.getById(context.supabase, data.id);
    if (!client) throw new Error("Cliente não encontrado");
    return client;
  });

export const getClientProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.number().int().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    return agencyProjectRepository.listByClient(context.supabase, data.id);
  });

export const getClientNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.number().int().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    return agencyNoteRepository.listByClient(context.supabase, data.id);
  });

export const getClientTimeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.number().int().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    return agencyTimelineRepository.listRecent(context.supabase, 40, data.id);
  });

export const getPipelineKanban = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAgencyOsAdmin(context);
    return agencyLeadRepository.buildPipelineBoard(context.supabase);
  });

export const moveAgencyLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => moveLeadSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const cmdCtx = buildCommandContext({
      userId: context.userId,
      actorEmail: actorEmailFromClaims(context.claims),
      supabase: context.supabase,
      source: "moveAgencyLead",
    });
    const result = await dispatchAgencyCommand("moveLead", cmdCtx, data);
    if (!result.ok) throw new Error(result.error);
    return { ok: true as const };
  });

export const convertLeadToClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => convertLeadSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const cmdCtx = buildCommandContext({
      userId: context.userId,
      actorEmail: actorEmailFromClaims(context.claims),
      supabase: context.supabase,
      source: "convertLeadToClient",
    });
    const result = await dispatchAgencyCommand("convertLead", cmdCtx, data);
    if (!result.ok) throw new Error(result.error);
    return result.data!;
  });

export const createAgencyLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createLeadSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const cmdCtx = buildCommandContext({
      userId: context.userId,
      actorEmail: actorEmailFromClaims(context.claims),
      supabase: context.supabase,
      source: "createAgencyLead",
    });
    const result = await dispatchAgencyCommand("createLead", cmdCtx, data);
    if (!result.ok) throw new Error(result.error);
    return result.data!;
  });

export const createAgencyProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createProjectSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const cmdCtx = buildCommandContext({
      userId: context.userId,
      actorEmail: actorEmailFromClaims(context.claims),
      supabase: context.supabase,
      source: "createAgencyProject",
    });
    const result = await dispatchAgencyCommand("createProject", cmdCtx, data);
    if (!result.ok) throw new Error(result.error);
    return result.data!;
  });

export const createAgencyTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createTaskSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const cmdCtx = buildCommandContext({
      userId: context.userId,
      actorEmail: actorEmailFromClaims(context.claims),
      supabase: context.supabase,
      source: "createAgencyTask",
    });
    const result = await dispatchAgencyCommand("createTask", cmdCtx, data);
    if (!result.ok) throw new Error(result.error);
    return result.data!;
  });

export const updateAgencyClientOperational = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateClientOperationalSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const cmdCtx = buildCommandContext({
      userId: context.userId,
      actorEmail: actorEmailFromClaims(context.claims),
      supabase: context.supabase,
      source: "updateAgencyClientOperational",
    });
    const result = await dispatchAgencyCommand("updateClientOperational", cmdCtx, data);
    if (!result.ok) throw new Error(result.error);
    return { ok: true as const };
  });

export const getClientIntelligence = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.number().int().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const [client, tasks, projects] = await Promise.all([
      agencyClientRepository.getById(context.supabase, data.id),
      agencyTaskRepository.listByClient(context.supabase, data.id),
      agencyProjectRepository.listByClient(context.supabase, data.id),
    ]);
    if (!client) throw new Error("Cliente não encontrado");

    const performance = await fetchClientPerformance(context.supabase, client.nome_cliente);
    return buildClientIntelligence({ client, tasks, projects, performance });
  });

export const searchAgencyOsCommand = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => agencySearchSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const [clients, leads, projects, tasks] = await Promise.all([
      agencyClientRepository.list(context.supabase),
      agencyLeadRepository.listActive(context.supabase),
      agencyProjectRepository.listActive(context.supabase),
      agencyTaskRepository.listOpen(context.supabase),
    ]);
    return searchAgencyOs({ query: data.query, clients, leads, projects, tasks });
  });
