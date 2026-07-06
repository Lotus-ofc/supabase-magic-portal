import type { SupabaseClient } from "@supabase/supabase-js";
import { contentCardRepository } from "../repositories/content-card.repository.server";
import { contentCardEventRepository } from "../repositories/content-card-event.repository.server";
import type { LifecycleActor } from "./card-lifecycle.server";
import { assertCardAction } from "../permissions/resolve-card-action";
import { assertCardInClientAccess } from "./client-access.server";

async function appendClientEvent(
  supabase: SupabaseClient,
  cardId: string,
  actor: LifecycleActor,
  eventType: "approved" | "changes_requested" | "commented",
  payload: Record<string, unknown>,
) {
  return contentCardEventRepository.append(supabase, {
    card_id: cardId,
    actor_id: actor.userId,
    actor_email: actor.email,
    event_type: eventType,
    payload,
  });
}

export async function clientApproveCard(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  input: { card_id: string; mensagem?: string | null },
): Promise<void> {
  assertCardAction({ role: actor.role, action: "approve" });
  const card = await contentCardRepository.findById(supabase, input.card_id);
  if (!card) throw new Error("Card não encontrado");
  await assertCardInClientAccess(supabase, actor.userId, card.cliente_nome);
  if (card.status !== "aguardando_aprovacao") {
    throw new Error("Só é possível aprovar conteúdos aguardando aprovação.");
  }
  await appendClientEvent(supabase, input.card_id, actor, "approved", {
    mensagem: input.mensagem?.trim() || null,
  });
}

export async function clientRequestChanges(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  input: { card_id: string; mensagem: string },
): Promise<void> {
  assertCardAction({ role: actor.role, action: "request_changes" });
  const card = await contentCardRepository.findById(supabase, input.card_id);
  if (!card) throw new Error("Card não encontrado");
  await assertCardInClientAccess(supabase, actor.userId, card.cliente_nome);
  if (card.status !== "aguardando_aprovacao") {
    throw new Error("Só é possível solicitar alteração em conteúdos aguardando aprovação.");
  }
  if (!input.mensagem.trim()) {
    throw new Error("Descreva a alteração solicitada.");
  }
  await appendClientEvent(supabase, input.card_id, actor, "changes_requested", {
    mensagem: input.mensagem.trim(),
  });
}

export async function clientCommentCard(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  input: { card_id: string; mensagem: string },
): Promise<void> {
  assertCardAction({ role: actor.role, action: "comment" });
  const card = await contentCardRepository.findById(supabase, input.card_id);
  if (!card) throw new Error("Card não encontrado");
  await assertCardInClientAccess(supabase, actor.userId, card.cliente_nome);
  if (!input.mensagem.trim()) throw new Error("Comentário obrigatório.");
  await appendClientEvent(supabase, input.card_id, actor, "commented", {
    mensagem: input.mensagem.trim(),
  });
}
