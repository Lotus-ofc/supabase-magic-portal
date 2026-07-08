import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommandContext } from "@/modules/core/types/commands";
import { DOMAIN_EVENTS, type DomainEvent } from "@/modules/core/types/domain-events";
import { agencyLeadRepository } from "../repositories/lead.repository.server";
import { agencyProjectRepository } from "../repositories/project.repository.server";
import { agencyTaskRepository } from "../repositories/task.repository.server";
import { agencyClientRepository } from "../repositories/client.repository.server";
import {
  addNoteSchema,
  completeTaskSchema,
  convertLeadSchema,
  createLeadSchema,
  createProjectSchema,
  createTaskSchema,
  moveLeadSchema,
  moveProjectSchema,
  updateClientOperationalSchema,
} from "../validators";
import { commandBus } from "@/modules/core/commands/command-bus";

function supabaseFrom(ctx: CommandContext): SupabaseClient {
  const sb = ctx.services?.supabase as SupabaseClient | undefined;
  if (!sb) throw new Error("Supabase client missing in command context");
  return sb;
}

function baseMeta(ctx: CommandContext) {
  return {
    actorId: ctx.userId,
    actorEmail: ctx.actorEmail ?? null,
    occurredAt: new Date().toISOString(),
    source: ctx.source,
    ip: ctx.ip ?? null,
    userAgent: ctx.userAgent ?? null,
  };
}

export function registerAgencyOsCommands(): void {
  commandBus.register({
    name: "MoveProject",
    module: "agency-os",
    schema: moveProjectSchema,
    async execute(ctx, input) {
      await agencyProjectRepository.move(supabaseFrom(ctx), input);
      return { ok: true as const, projectId: input.id, status: input.status_kanban };
    },
    toEvents(ctx, input, result) {
      const events: DomainEvent[] = [
        {
          type:
            result.status === "finalizado"
              ? DOMAIN_EVENTS.PROJECT_COMPLETED
              : DOMAIN_EVENTS.PROJECT_MOVED,
          payload: { projectId: input.id, status: input.status_kanban },
          metadata: baseMeta(ctx),
        },
      ];
      return events;
    },
  });

  commandBus.register({
    name: "CompleteTask",
    module: "agency-os",
    schema: completeTaskSchema,
    async execute(ctx, input) {
      await agencyTaskRepository.complete(supabaseFrom(ctx), input.id);
      return { ok: true as const, taskId: input.id };
    },
    toEvents(ctx, input) {
      return [
        {
          type: DOMAIN_EVENTS.TASK_COMPLETED,
          payload: { taskId: input.id },
          metadata: baseMeta(ctx),
        },
      ];
    },
  });

  commandBus.register({
    name: "CreateNote",
    module: "agency-os",
    schema: addNoteSchema,
    async execute(ctx, input) {
      const { error } = await supabaseFrom(ctx).from("agency_notes").insert({
        cadastro_cliente_id: input.cadastro_cliente_id,
        body: input.body,
        author_user_id: ctx.userId,
        author_email: ctx.actorEmail,
      });
      if (error) throw new Error(error.message);
      return { ok: true as const, clienteId: input.cadastro_cliente_id };
    },
    toEvents(ctx, input) {
      return [
        {
          type: DOMAIN_EVENTS.NOTE_CREATED,
          payload: { clienteId: input.cadastro_cliente_id },
          metadata: baseMeta(ctx),
        },
      ];
    },
  });

  commandBus.register({
    name: "MoveLead",
    module: "agency-os",
    schema: moveLeadSchema,
    async execute(ctx, input) {
      await agencyLeadRepository.move(supabaseFrom(ctx), input);
      return { ok: true as const, leadId: input.id, stage: input.pipeline_stage };
    },
    toEvents(ctx, input) {
      return [
        {
          type: DOMAIN_EVENTS.LEAD_MOVED,
          payload: { leadId: input.id, stage: input.pipeline_stage },
          metadata: baseMeta(ctx),
        },
      ];
    },
  });

  commandBus.register({
    name: "ConvertLead",
    module: "agency-os",
    schema: convertLeadSchema,
    async execute(ctx, input) {
      const result = await agencyLeadRepository.convertToClient(supabaseFrom(ctx), input);
      return result;
    },
    toEvents(ctx, input, result) {
      return [
        {
          type: DOMAIN_EVENTS.LEAD_CONVERTED,
          payload: {
            leadId: input.leadId,
            cadastroClienteId: result.cadastro_cliente_id,
          },
          metadata: baseMeta(ctx),
        },
        {
          type: DOMAIN_EVENTS.CLIENT_CREATED,
          payload: { cadastroClienteId: result.cadastro_cliente_id },
          metadata: baseMeta(ctx),
        },
      ];
    },
  });

  commandBus.register({
    name: "CreateLead",
    module: "agency-os",
    schema: createLeadSchema,
    async execute(ctx, input) {
      const lead = await agencyLeadRepository.create(supabaseFrom(ctx), {
        ...input,
        created_by: ctx.userId,
      });
      return { ok: true as const, leadId: lead.id };
    },
    toEvents(ctx, _input, result) {
      return [
        {
          type: DOMAIN_EVENTS.LEAD_CREATED,
          payload: { leadId: result.leadId },
          metadata: baseMeta(ctx),
        },
      ];
    },
  });

  commandBus.register({
    name: "CreateProject",
    module: "agency-os",
    schema: createProjectSchema,
    async execute(ctx, input) {
      const project = await agencyProjectRepository.create(supabaseFrom(ctx), {
        ...input,
        created_by: ctx.userId,
      });
      return { ok: true as const, projectId: project.id };
    },
    toEvents(ctx, input, result) {
      return [
        {
          type: DOMAIN_EVENTS.PROJECT_CREATED,
          payload: { projectId: result.projectId, clienteId: input.cadastro_cliente_id },
          metadata: baseMeta(ctx),
        },
      ];
    },
  });

  commandBus.register({
    name: "CreateTask",
    module: "agency-os",
    schema: createTaskSchema,
    async execute(ctx, input) {
      const task = await agencyTaskRepository.create(supabaseFrom(ctx), {
        ...input,
        created_by: ctx.userId,
      });
      return { ok: true as const, taskId: task.id };
    },
    toEvents(ctx, input, result) {
      return [
        {
          type: DOMAIN_EVENTS.TASK_CREATED,
          payload: { taskId: result.taskId, clienteId: input.cadastro_cliente_id },
          metadata: baseMeta(ctx),
        },
      ];
    },
  });

  commandBus.register({
    name: "UpdateClientOperational",
    module: "agency-os",
    schema: updateClientOperationalSchema,
    async execute(ctx, input) {
      const { id, ...fields } = input;
      await agencyClientRepository.updateOperational(supabaseFrom(ctx), { id, ...fields });
      return { ok: true as const, clienteId: id };
    },
    toEvents(ctx, input) {
      return [
        {
          type: DOMAIN_EVENTS.CLIENT_UPDATED,
          payload: { cadastroClienteId: input.id },
          metadata: baseMeta(ctx),
        },
      ];
    },
  });
}
