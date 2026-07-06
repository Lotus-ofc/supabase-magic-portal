import type { SupabaseClient } from "@supabase/supabase-js";
import { contentCardRepository } from "../repositories/content-card.repository.server";
import { contentCardEventRepository } from "../repositories/content-card-event.repository.server";
import type { ContentCard } from "../types/content-card";
import type { ApprovalRole } from "../types/approval-role";
import { assertCardAction } from "../permissions/resolve-card-action";
import { isHardDeleteForbidden } from "../services/migration-helpers";
import { eventTypeForTransition } from "../services/event-type-for-transition";
import type { LifecycleActor } from "./card-lifecycle.server";

export async function archiveLibraryContent(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  cardId: string,
): Promise<ContentCard> {
  assertCardAction({ role: actor.role, action: "archive" });
  const existing = await contentCardRepository.findById(supabase, cardId);
  if (!existing) throw new Error("Conteúdo não encontrado");
  if (existing.status !== "publicado") {
    throw new Error("Somente conteúdos publicados podem ser arquivados na Biblioteca.");
  }
  if (!existing.published_at) {
    throw new Error("Conteúdo sem data de publicação.");
  }

  const card = await contentCardRepository.update(supabase, cardId, {
    status: "arquivado",
    archived_at: existing.archived_at ?? new Date().toISOString(),
    published_at: existing.published_at,
  });

  const eventType = eventTypeForTransition(existing.status, "arquivado");
  await contentCardEventRepository.append(supabase, {
    card_id: cardId,
    actor_id: actor.userId,
    actor_email: actor.email,
    event_type: eventType,
    payload: {
      source: "library_archive",
      status_de: existing.status,
      status_para: "arquivado",
    },
  });

  return card;
}

export async function deleteContentCard(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  cardId: string,
): Promise<void> {
  assertCardAction({ role: actor.role, action: "delete" });
  const existing = await contentCardRepository.findById(supabase, cardId);
  if (!existing) throw new Error("Card não encontrado");
  if (isHardDeleteForbidden(existing.status)) {
    throw new Error("Exclusão permanente proibida para conteúdos publicados ou arquivados.");
  }

  const { error } = await supabase.from("content_cards").delete().eq("id", cardId);
  if (error) throw new Error(error.message);
}
