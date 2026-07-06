import type { ContentCard } from "../types/content-card";

export type PublishTarget = "instagram" | "facebook" | "linkedin" | "tiktok" | "custom";

export type PublishRequest = {
  cardId: string;
  target: PublishTarget;
  scheduledAt?: string;
};

export type PublishResult = {
  externalId: string;
  publishedAt: string;
  url?: string;
};

/** Port para publicação externa (redes sociais, CMS). Sem implementação na Fase 0. */
export interface ContentPublisherPort {
  publish(request: PublishRequest): Promise<PublishResult>;
  unpublish(cardId: string, target: PublishTarget): Promise<void>;
  getPublishedState(cardId: string): Promise<Partial<Record<PublishTarget, PublishResult>>>;
}

export type WorkflowAutomationTrigger =
  | "card_moved"
  | "approval_requested"
  | "approved"
  | "rejected"
  | "published";

export type WorkflowAutomationPayload = {
  card: ContentCard;
  trigger: WorkflowAutomationTrigger;
  metadata?: Record<string, unknown>;
};

/** Port para automações (n8n, webhooks, notificações). Sem implementação na Fase 0. */
export interface WorkflowAutomationPort {
  emit(payload: WorkflowAutomationPayload): Promise<void>;
}
