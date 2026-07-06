/** Catálogo de eventos de domínio — extensível por módulos. */
export const DOMAIN_EVENTS = {
  CLIENT_CREATED: "CLIENT_CREATED",
  CLIENT_UPDATED: "CLIENT_UPDATED",
  PROJECT_CREATED: "PROJECT_CREATED",
  PROJECT_UPDATED: "PROJECT_UPDATED",
  PROJECT_COMPLETED: "PROJECT_COMPLETED",
  PROJECT_MOVED: "PROJECT_MOVED",
  TASK_CREATED: "TASK_CREATED",
  TASK_COMPLETED: "TASK_COMPLETED",
  LEAD_CREATED: "LEAD_CREATED",
  LEAD_CONVERTED: "LEAD_CONVERTED",
  LEAD_MOVED: "LEAD_MOVED",
  NOTE_CREATED: "NOTE_CREATED",
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  PAYMENT_OVERDUE: "PAYMENT_OVERDUE",
  CAMPAIGN_STARTED: "CAMPAIGN_STARTED",
  CAMPAIGN_PAUSED: "CAMPAIGN_PAUSED",
  LANDING_PUBLISHED: "LANDING_PUBLISHED",
  CONTRACT_SENT: "CONTRACT_SENT",
  CONTRACT_SIGNED: "CONTRACT_SIGNED",
} as const;

export type DomainEventType = (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];

export interface DomainEventMetadata {
  actorId?: string | null;
  actorEmail?: string | null;
  occurredAt: string;
  source: string;
  correlationId?: string;
  ip?: string | null;
  userAgent?: string | null;
}

export interface DomainEvent<TPayload = Record<string, unknown>> {
  type: DomainEventType;
  payload: TPayload;
  metadata: DomainEventMetadata;
}

export type DomainEventHandler<TPayload = Record<string, unknown>> = (
  event: DomainEvent<TPayload>,
) => void | Promise<void>;
