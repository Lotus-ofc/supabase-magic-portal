import type { ContentCardEventType } from "../types/content-card-event";
import type { ContentCardStatus } from "../types/content-card";

/** Mapeia status legado post_status → content_card_status (espelha SQL migration 18). */
const LEGACY_POST_STATUS_MAP: Record<string, ContentCardStatus> = {
  rascunho: "producao",
  em_producao: "producao",
  aguardando_aprovacao: "aguardando_aprovacao",
  aprovado: "aprovado",
  publicado: "publicado",
};

export function mapLegacyPostStatus(legacy: string): ContentCardStatus {
  return LEGACY_POST_STATUS_MAP[legacy] ?? "producao";
}

/** Mapeia tipo legado post_revision_tipo → content_card_event_type. */
const LEGACY_REVISION_MAP: Record<string, ContentCardEventType> = {
  comentario: "commented",
  solicitacao_alteracao: "commented",
  aprovacao: "approved",
  reprovacao: "rejected",
  mudanca_status: "moved",
};

export function mapLegacyRevisionTipo(legacy: string): ContentCardEventType {
  return LEGACY_REVISION_MAP[legacy] ?? "updated";
}

export const LIBRARY_STATUSES: ContentCardStatus[] = ["publicado", "arquivado"];

export function isLibraryStatus(status: ContentCardStatus): boolean {
  return LIBRARY_STATUSES.includes(status);
}

export function isHardDeleteForbidden(status: ContentCardStatus): boolean {
  return status === "publicado" || status === "arquivado";
}
