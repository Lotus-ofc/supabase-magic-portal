import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommandContext } from "@/modules/core/types/commands";
import { DOMAIN_EVENTS, type DomainEvent } from "@/modules/core/types/domain-events";
import { agencyLeadRepository } from "../repositories/lead.repository.server";
import { agencyProjectRepository } from "../repositories/project.repository.server";
import { agencyTaskRepository } from "../repositories/task.repository.server";
import {
  addNoteSchema,
  completeTaskSchema,
  convertLeadSchema,
  moveLeadSchema,
  moveProjectSchema,
} from "../validators";
import { commandBus } from "@/modules/core/commands/command-bus";
import { dispatchCommand } from "@/modules/core/server/dispatch-command.server";

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
}

/** Mapa legado command name → bus name para compatibilidade interna. */
export const AGENCY_COMMANDS = {
  moveProject: "MoveProject",
  completeTask: "CompleteTask",
  createNote: "CreateNote",
  moveLead: "MoveLead",
  convertLead: "ConvertLead",
} as const;

export async function dispatchAgencyCommand<T>(
  name: keyof typeof AGENCY_COMMANDS,
  ctx: CommandContext,
  input: unknown,
) {
  return dispatchCommand<T>(AGENCY_COMMANDS[name], ctx, input, { module: "agency-os" });
}
