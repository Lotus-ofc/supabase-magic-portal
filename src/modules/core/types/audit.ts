export interface AuditEntry {
  id?: string;
  action: string;
  module: string;
  entityType?: string | null;
  entityId?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  source: string;
  ip?: string | null;
  userAgent?: string | null;
  createdAt?: string;
}
