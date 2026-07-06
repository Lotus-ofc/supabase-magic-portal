import type { z } from "zod";
import type { CommandContext, CommandDefinition, CommandDispatchResult } from "../types/commands";
import type { DomainEvent } from "../types/domain-events";
import { eventBus } from "../event-bus/event-bus";

export class CommandBus {
  private commands = new Map<string, CommandDefinition>();

  register<TInput, TResult>(def: CommandDefinition<TInput, TResult>): void {
    if (this.commands.has(def.name)) {
      throw new Error(`Command already registered: ${def.name}`);
    }
    this.commands.set(def.name, def as CommandDefinition);
  }

  get(name: string): CommandDefinition | undefined {
    return this.commands.get(name);
  }

  list(): CommandDefinition[] {
    return [...this.commands.values()];
  }

  async dispatch<TInput, TResult>(
    name: string,
    ctx: CommandContext,
    input: unknown,
  ): Promise<CommandDispatchResult<TResult>> {
    const def = this.commands.get(name);
    if (!def) return { ok: false, error: `Command not found: ${name}` };

    let parsed: TInput;
    try {
      parsed = (def.schema as z.ZodType<TInput>).parse(input);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Validation failed";
      return { ok: false, error: msg };
    }

    try {
      const data = (await def.execute(ctx, parsed)) as TResult;
      const events: DomainEvent[] = def.toEvents?.(ctx, parsed, data) ?? [];
      for (const event of events) {
        await eventBus.emit(event);
      }
      return { ok: true, data, events };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Command execution failed";
      return { ok: false, error: msg };
    }
  }
}

export const commandBus = new CommandBus();
