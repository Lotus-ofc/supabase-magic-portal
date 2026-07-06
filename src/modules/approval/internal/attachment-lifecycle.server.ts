import type { SupabaseClient } from "@supabase/supabase-js";
import { contentCardAttachmentRepository } from "../repositories/content-card-attachment.repository.server";
import { contentCardEventRepository } from "../repositories/content-card-event.repository.server";
import type { AttachmentKind } from "../types/content-card-attachment";
import type { LifecycleActor } from "./card-lifecycle.server";
import { capaUrlToAsset, type MediaAsset } from "@/lib/media-preview";
import { assertCardAction } from "../permissions/resolve-card-action";

const EDITORIAL_BUCKET = "editorial-media";
const SIGNED_URL_TTL = 3600;

export function inferAttachmentKind(mime: string): AttachmentKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  return "document";
}

async function signedUrlFor(supabase: SupabaseClient, path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(EDITORIAL_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "URL de mídia indisponível");
  return data.signedUrl;
}

export async function listCardAttachmentsWithUrls(
  supabase: SupabaseClient,
  cardId: string,
  capaUrl: string | null,
): Promise<MediaAsset[]> {
  const rows = await contentCardAttachmentRepository.listByCardId(supabase, cardId);
  if (rows.length === 0) return capaUrlToAsset(capaUrl);

  const assets: MediaAsset[] = [];
  for (const row of rows) {
    const url = await signedUrlFor(supabase, row.storage_path);
    const posterUrl = row.poster_path ? await signedUrlFor(supabase, row.poster_path) : null;
    assets.push({
      id: row.id,
      kind: row.kind === "video" ? "video" : "image",
      url,
      posterUrl,
      mimeType: row.mime_type,
      ordem: row.ordem,
    });
  }
  return assets;
}

export async function uploadCardAttachment(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  input: {
    cardId: string;
    fileName: string;
    mimeType: string;
    base64: string;
    ordem?: number;
    mediaRole?: "preview" | "attachment";
  },
) {
  assertCardAction({ role: actor.role, action: "edit" });
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `content-cards/${input.cardId}/${Date.now()}-${safeName}`;
  const bytes = Uint8Array.from(atob(input.base64), (c) => c.charCodeAt(0));

  const { error: upErr } = await supabase.storage
    .from(EDITORIAL_BUCKET)
    .upload(storagePath, bytes, { contentType: input.mimeType, upsert: false });
  if (upErr) throw new Error(upErr.message);

  const existing = await contentCardAttachmentRepository.listByCardId(supabase, input.cardId);
  const ordem = input.ordem ?? existing.length;
  const kind = inferAttachmentKind(input.mimeType);

  const attachment = await contentCardAttachmentRepository.insert(supabase, {
    card_id: input.cardId,
    storage_path: storagePath,
    mime_type: input.mimeType,
    kind,
    media_role: input.mediaRole ?? (ordem === 0 ? "preview" : "attachment"),
    file_name: input.fileName,
    file_size: bytes.byteLength,
    ordem,
    width: null,
    height: null,
    duration_seconds: null,
    poster_path: null,
    legacy_media_id: null,
  });

  await contentCardEventRepository.append(supabase, {
    card_id: input.cardId,
    actor_id: actor.userId,
    actor_email: actor.email,
    event_type: "attachment_added",
    payload: { attachment_id: attachment.id, file_name: input.fileName, kind },
  });

  const url = await signedUrlFor(supabase, storagePath);
  return { attachment, url };
}

export async function deleteCardAttachment(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  input: { cardId: string; attachmentId: string },
) {
  assertCardAction({ role: actor.role, action: "edit" });
  const rows = await contentCardAttachmentRepository.listByCardId(supabase, input.cardId);
  const row = rows.find((r) => r.id === input.attachmentId);
  if (!row) throw new Error("Anexo não encontrado");

  await supabase.storage.from(EDITORIAL_BUCKET).remove([row.storage_path]);
  if (row.poster_path) await supabase.storage.from(EDITORIAL_BUCKET).remove([row.poster_path]);
  await contentCardAttachmentRepository.deleteById(supabase, input.attachmentId);

  await contentCardEventRepository.append(supabase, {
    card_id: input.cardId,
    actor_id: actor.userId,
    actor_email: actor.email,
    event_type: "attachment_removed",
    payload: { attachment_id: input.attachmentId, file_name: row.file_name },
  });
  return { ok: true };
}
