/** Buffer legado em memória — fallback até migration 13; fonte primária: access_audit_log. */

export type InviteAuditAction = "invite" | "resend";

export interface InviteAuditEntry {
  id: string;
  at: string;
  email: string;
  user_id?: string;
  action: InviteAuditAction;
  app_url: string;
  redirect_to: string;
  success: boolean;
  error?: string;
}

const MAX_ENTRIES = 100;
const buffer: InviteAuditEntry[] = [];

export function recordInviteAudit(entry: Omit<InviteAuditEntry, "id" | "at">): InviteAuditEntry {
  const row: InviteAuditEntry = {
    ...entry,
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
  };
  buffer.push(row);
  while (buffer.length > MAX_ENTRIES) buffer.shift();
  return row;
}

export function getInviteAuditLog(limit = 50): InviteAuditEntry[] {
  return [...buffer].reverse().slice(0, limit);
}

export function getInviteStatsForEmail(email: string): {
  last_sent_at: string | null;
  first_sent_at: string | null;
  resend_count: number;
  invite_count: number;
  last_success: boolean | null;
  last_error: string | null;
} {
  const normalized = email.toLowerCase();
  const entries = buffer.filter((e) => e.email.toLowerCase() === normalized);
  if (entries.length === 0) {
    return {
      last_sent_at: null,
      first_sent_at: null,
      resend_count: 0,
      invite_count: 0,
      last_success: null,
      last_error: null,
    };
  }
  const last = entries[entries.length - 1]!;
  return {
    last_sent_at: last.at,
    first_sent_at: entries[0]!.at,
    resend_count: entries.filter((e) => e.action === "resend").length,
    invite_count: entries.filter((e) => e.action === "invite").length,
    last_success: last.success,
    last_error: last.error ?? null,
  };
}
