import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientAccessScope } from "./client-access.server";
import { libraryRepository } from "../repositories/library.repository.server";
import { editorialPillarRepository } from "../repositories/editorial-pillar.repository.server";
import { listCardAttachmentsWithUrls } from "./attachment-lifecycle.server";
import type { LibraryItemDetail, LibrarySearchFilters } from "../library/types/library";

export async function searchLibrary(
  supabase: SupabaseClient,
  filters: LibrarySearchFilters,
  scope?: ClientAccessScope,
) {
  return libraryRepository.search(supabase, filters, {
    cadastroClienteIds: scope?.cadastroClienteIds,
    clientNames: scope?.clientNames,
  });
}

export async function getLibraryItemDetail(
  supabase: SupabaseClient,
  id: string,
  scope?: ClientAccessScope,
): Promise<LibraryItemDetail | null> {
  const card = await libraryRepository.findByIdInLibrary(supabase, id, {
    cadastroClienteIds: scope?.cadastroClienteIds,
    clientNames: scope?.clientNames,
  });
  if (!card) return null;

  const attachments = await listCardAttachmentsWithUrls(supabase, card.id, card.capa_url);

  let pillar: LibraryItemDetail["pillar"] = null;
  if (card.pilar_id) {
    const p = await editorialPillarRepository.findById(supabase, card.pilar_id);
    if (p) pillar = { id: p.id, titulo: p.titulo, objetivo: p.objetivo, cor: p.cor };
  }

  return {
    card,
    pillar,
    attachments: attachments.map((a) => ({
      id: a.id,
      url: a.url,
      mime_type: a.mimeType ?? "application/octet-stream",
      file_name: a.id,
    })),
  };
}
