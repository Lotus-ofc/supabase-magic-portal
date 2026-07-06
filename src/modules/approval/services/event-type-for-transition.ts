import type { ContentCardEventType } from "../types/content-card-event";
import type { ContentCardStatus } from "../types/content-card";

/** Mapeia transição de status → tipo de evento append-only. */
export function eventTypeForTransition(
  from: ContentCardStatus,
  to: ContentCardStatus,
): ContentCardEventType {
  if (from === to) return "updated";
  if (to === "aguardando_aprovacao") return "approval_requested";
  if (to === "aprovado") return "approved";
  if (to === "edicao" && from === "aguardando_aprovacao") return "rejected";
  if (to === "publicado") return "published";
  if (to === "arquivado") return "archived";
  return "moved";
}
