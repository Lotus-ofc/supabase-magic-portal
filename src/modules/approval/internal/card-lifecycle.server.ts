import type { SupabaseClient } from "@supabase/supabase-js";
import { contentCardRepository } from "../repositories/content-card.repository.server";
import { contentCardEventRepository } from "../repositories/content-card-event.repository.server";
import type { ContentCard, ContentCardInsert, ContentCardStatus } from "../types/content-card";
import type { ApprovalRole } from "../types/approval-role";
import { assertCardAction } from "../permissions/resolve-card-action";
import { assertValidTransition } from "../workflow/status-machine";
import { eventTypeForTransition } from "../services/event-type-for-transition";
import type { ContentCardUpdate } from "../types/content-card";

export type LifecycleActor = {
  userId: string;
  email: string | null;
  role: ApprovalRole;
};

function assertAction(
  role: ApprovalRole,
  action: Parameters<typeof assertCardAction>[0]["action"],
) {
  assertCardAction({ role, action });
}

async function appendEvent(
  supabase: SupabaseClient,
  cardId: string,
  actor: LifecycleActor,
  eventType: Parameters<typeof contentCardEventRepository.append>[1]["event_type"],
  payload: Record<string, unknown> = {},
) {
  return contentCardEventRepository.append(supabase, {
    card_id: cardId,
    actor_id: actor.userId,
    actor_email: actor.email,
    event_type: eventType,
    payload,
  });
}

export async function createContentCard(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  input: ContentCardInsert,
): Promise<ContentCard> {
  assertAction(actor.role, "create");
  const card = await contentCardRepository.insert(supabase, {
    ...input,
    created_by: actor.userId,
    cliente_nome: input.cliente_nome,
    status: input.status ?? "producao",
    kanban_ordem: input.kanban_ordem ?? 0,
    checklist: input.checklist ?? [],
    ai_metadata: input.ai_metadata ?? {},
    integration_metadata: input.integration_metadata ?? {},
  });
  await appendEvent(supabase, card.id, actor, "created", { titulo: card.titulo });
  return card;
}

export async function updateContentCard(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  cardId: string,
  patch: ContentCardUpdate,
): Promise<ContentCard> {
  assertAction(actor.role, "edit");
  const existing = await contentCardRepository.findById(supabase, cardId);
  if (!existing) throw new Error("Card não encontrado");
  const card = await contentCardRepository.update(supabase, cardId, patch);
  await appendEvent(supabase, cardId, actor, "updated", {
    fields: Object.keys(patch),
    status_de: existing.status,
    status_para: card.status,
  });
  return card;
}

export async function moveContentCard(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  input: { id: string; status: ContentCardStatus; kanban_ordem: number },
): Promise<ContentCard> {
  assertAction(actor.role, "move");
  const existing = await contentCardRepository.findById(supabase, input.id);
  if (!existing) throw new Error("Card não encontrado");

  assertValidTransition(existing.status, input.status);

  const patch: ContentCardUpdate = {
    status: input.status,
    kanban_ordem: input.kanban_ordem,
  };
  if (input.status === "publicado" && !existing.published_at) {
    patch.published_at = new Date().toISOString();
  }
  if (input.status === "arquivado" && !existing.archived_at) {
    patch.archived_at = new Date().toISOString();
  }

  const card = await contentCardRepository.update(supabase, input.id, patch);
  const eventType = eventTypeForTransition(existing.status, input.status);
  await appendEvent(supabase, input.id, actor, eventType, {
    status_de: existing.status,
    status_para: input.status,
    kanban_ordem: input.kanban_ordem,
  });
  return card;
}

export async function archiveContentCard(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  cardId: string,
): Promise<ContentCard> {
  assertAction(actor.role, "archive");
  const existing = await contentCardRepository.findById(supabase, cardId);
  if (!existing) throw new Error("Card não encontrado");
  return moveContentCard(supabase, actor, {
    id: cardId,
    status: "arquivado",
    kanban_ordem: existing.kanban_ordem,
  });
}

export async function duplicateContentCard(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  cardId: string,
): Promise<ContentCard> {
  assertAction(actor.role, "create");
  const source = await contentCardRepository.findById(supabase, cardId);
  if (!source) throw new Error("Card não encontrado");

  const copy = await createContentCard(supabase, actor, {
    cadastro_cliente_id: source.cadastro_cliente_id,
    cliente_nome: source.cliente_nome,
    data_publicacao: source.data_publicacao,
    hora_publicacao: source.hora_publicacao,
    titulo: `${source.titulo} (cópia)`,
    legenda: source.legenda,
    copy_text: source.copy_text,
    roteiro: source.roteiro,
    direcao_arte: source.direcao_arte,
    cta: source.cta,
    plataforma: source.plataforma,
    formato: source.formato,
    capa_url: source.capa_url,
    status: "producao",
    checklist: source.checklist,
    localizacao: source.localizacao,
    tags: source.tags,
    observacoes: source.observacoes,
    responsavel_email: source.responsavel_email,
    responsavel_user_id: source.responsavel_user_id,
    pilar_id: source.pilar_id,
    estrategia_id: source.estrategia_id,
    kanban_ordem: source.kanban_ordem + 1,
    ai_metadata: source.ai_metadata,
    integration_metadata: source.integration_metadata,
    legacy_post_id: null,
  });

  await appendEvent(supabase, copy.id, actor, "created", {
    duplicated_from: source.id,
    titulo: copy.titulo,
  });
  return copy;
}

export async function addCardComment(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  input: { card_id: string; mensagem: string },
): Promise<void> {
  assertAction(actor.role, "comment");
  const card = await contentCardRepository.findById(supabase, input.card_id);
  if (!card) throw new Error("Card não encontrado");
  await appendEvent(supabase, input.card_id, actor, "commented", {
    mensagem: input.mensagem,
  });
}
