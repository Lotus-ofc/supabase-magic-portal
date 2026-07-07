import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommandContext, CommandDispatchResult } from "../types/commands";
import { commandBus } from "../commands/command-bus";
import { auditLogger } from "../audit/audit-logger";
import { wireAuditPersistence } from "../audit/audit-sink.server";
import { bootstrapOs } from "@/modules/os-bootstrap";

const wiredSupabase = new WeakSet<SupabaseClient>();

export function ensureAuditSink(supabase: SupabaseClient): void {
  if (wiredSupabase.has(supabase)) return;
  wireAuditPersistence(supabase);
  wiredSupabase.add(supabase);
}

export async function dispatchCommand<TResult>(
  commandName: string,
  ctx: CommandContext,
  input: unknown,
  audit?: {
    module: string;
    entityType?: string;
    entityId?: string;
    before?: Record<string, unknown> | null;
  },
): Promise<CommandDispatchResult<TResult>> {
  bootstrapOs();

  const supabase = ctx.services?.supabase as SupabaseClient | undefined;
  if (supabase) ensureAuditSink(supabase);

  const result = await commandBus.dispatch<TResult>(commandName, ctx, input);

  if (result.ok && supabase) {
    await auditLogger.log({
      action: commandName,
      module: audit?.module ?? "os",
      entityType: audit?.entityType ?? null,
      entityId: audit?.entityId ?? null,
      actorId: ctx.userId,
      actorEmail: ctx.actorEmail ?? null,
      before: audit?.before ?? null,
      after: (result.data as Record<string, unknown>) ?? null,
      source: ctx.source,
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    });
  }

  return result;
}

export function buildCommandContext(input: {
  userId: string;
  actorEmail?: string | null;
  supabase: SupabaseClient;
  source?: string;
  ip?: string | null;
  userAgent?: string | null;
}): CommandContext {
  return {
    userId: input.userId,
    actorEmail: input.actorEmail,
    source: input.source ?? "server",
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    services: { supabase: input.supabase },
  };
}
