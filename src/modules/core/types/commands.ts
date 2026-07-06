import type { z } from "zod";
import type { DomainEvent } from "./domain-events";

export interface CommandContext {
  userId: string;
  actorEmail?: string | null;
  source: string;
  ip?: string | null;
  userAgent?: string | null;
  /** Contexto opaco — Supabase client, etc. (server-only). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  services?: Record<string, any>;
}

export interface CommandResult<TResult = unknown> {
  ok: true;
  data: TResult;
  events: DomainEvent[];
}

export interface CommandError {
  ok: false;
  error: string;
}

export type CommandDispatchResult<TResult> = CommandResult<TResult> | CommandError;

export interface CommandDefinition<TInput = unknown, TResult = unknown> {
  name: string;
  module: string;
  schema: z.ZodType<TInput>;
  execute: (ctx: CommandContext, input: TInput) => Promise<TResult>;
  /** Preparado para rollback futuro — opcional. */
  rollback?: (ctx: CommandContext, input: TInput, result: TResult) => Promise<void>;
  /** Eventos emitidos após execução bem-sucedida. */
  toEvents?: (ctx: CommandContext, input: TInput, result: TResult) => DomainEvent[];
}
