import type { ContentCardStatus } from "../types/content-card";

/** Transições permitidas no workflow (admin/social_media). Cliente usa subset via permissions. */
const ALLOWED_TRANSITIONS: Record<ContentCardStatus, ContentCardStatus[]> = {
  producao: ["edicao", "aguardando_aprovacao", "arquivado"],
  edicao: ["producao", "aguardando_aprovacao", "arquivado"],
  aguardando_aprovacao: ["edicao", "aprovado", "producao"],
  aprovado: ["publicado", "edicao", "aguardando_aprovacao"],
  publicado: ["arquivado"],
  arquivado: [],
};

export function canTransitionStatus(from: ContentCardStatus, to: ContentCardStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertValidTransition(from: ContentCardStatus, to: ContentCardStatus): void {
  if (!canTransitionStatus(from, to)) {
    throw new Error(`Transição de status inválida: ${from} → ${to}`);
  }
}

/** Transições permitidas para cliente (aprovação). */
export function canClientTransitionStatus(from: ContentCardStatus, to: ContentCardStatus): boolean {
  if (from === "aguardando_aprovacao" && (to === "aprovado" || to === "edicao")) {
    return true;
  }
  return from === to;
}
