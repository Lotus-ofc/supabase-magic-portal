import { describe, expect, it } from "vitest";
import { commandBus } from "@/modules/core/commands/command-bus";
import { registerAgencyOsCommands } from "./register-commands";

describe("registerAgencyOsCommands", () => {
  it("registers all Central mutation commands", () => {
    registerAgencyOsCommands();

    for (const name of [
      "MoveProject",
      "CompleteTask",
      "CreateNote",
      "MoveLead",
      "ConvertLead",
      "CreateLead",
      "CreateProject",
      "CreateTask",
      "UpdateClientOperational",
    ]) {
      expect(commandBus.get(name), `missing command: ${name}`).toBeDefined();
    }
  });
});
