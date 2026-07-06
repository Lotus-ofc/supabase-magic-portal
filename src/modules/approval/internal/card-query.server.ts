import type { SupabaseClient } from "@supabase/supabase-js";
import { contentCardRepository } from "../repositories/content-card.repository.server";
import { contentCardEventRepository } from "../repositories/content-card-event.repository.server";
import { editorialPillarRepository } from "../repositories/editorial-pillar.repository.server";
import { buildKanbanBoard, type KanbanBoard } from "../services/build-kanban-board";
import { buildCardTimeline } from "../services/build-card-timeline";
import type { ContentCard } from "../types/content-card";
import { listCardAttachmentsWithUrls } from "./attachment-lifecycle.server";

export async function getKanbanBoardForClient(
  supabase: SupabaseClient,
  cadastroClienteId: number,
): Promise<KanbanBoard> {
  const cards = await contentCardRepository.listByClient(supabase, {
    cadastroClienteId,
    excludeArchived: true,
  });
  return buildKanbanBoard(cards);
}

export type CardDetail = {
  card: ContentCard;
  events: ReturnType<typeof buildCardTimeline>;
  attachments: Awaited<ReturnType<typeof listCardAttachmentsWithUrls>>;
  pillar: { id: string; titulo: string; objetivo: string | null; cor: string } | null;
};

export async function getCardDetail(
  supabase: SupabaseClient,
  cardId: string,
): Promise<CardDetail | null> {
  const card = await contentCardRepository.findById(supabase, cardId);
  if (!card) return null;

  const [events, attachments] = await Promise.all([
    contentCardEventRepository.listByCardId(supabase, cardId),
    listCardAttachmentsWithUrls(supabase, cardId, card.capa_url),
  ]);

  let pillar: CardDetail["pillar"] = null;
  if (card.pilar_id) {
    const p = await editorialPillarRepository.findById(supabase, card.pilar_id);
    if (p) pillar = { id: p.id, titulo: p.titulo, objetivo: p.objetivo, cor: p.cor };
  }

  return {
    card,
    events: buildCardTimeline(events),
    attachments,
    pillar,
  };
}
