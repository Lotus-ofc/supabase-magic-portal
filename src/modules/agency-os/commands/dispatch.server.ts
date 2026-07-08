import type { CommandContext } from "@/modules/core/types/commands";
import { dispatchCommand } from "@/modules/core/server/dispatch-command.server";

/** Mapa legado command name → bus name para compatibilidade interna. */
export const AGENCY_COMMANDS = {
  moveProject: "MoveProject",
  completeTask: "CompleteTask",
  createNote: "CreateNote",
  moveLead: "MoveLead",
  convertLead: "ConvertLead",
  createLead: "CreateLead",
  createProject: "CreateProject",
  createTask: "CreateTask",
  updateClientOperational: "UpdateClientOperational",
} as const;

export async function dispatchAgencyCommand<T>(
  name: keyof typeof AGENCY_COMMANDS,
  ctx: CommandContext,
  input: unknown,
) {
  return dispatchCommand<T>(AGENCY_COMMANDS[name], ctx, input, { module: "agency-os" });
}
