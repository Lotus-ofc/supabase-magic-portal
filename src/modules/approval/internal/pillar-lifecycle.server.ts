import type { SupabaseClient } from "@supabase/supabase-js";
import { editorialPillarRepository } from "../repositories/editorial-pillar.repository.server";
import type { EditorialPillar, EditorialPillarInsert } from "../types/editorial-pillar";
import type { ApprovalRole } from "../types/approval-role";
import { assertCardAction } from "../permissions/resolve-card-action";

export type PillarActor = {
  userId: string;
  email: string | null;
  role: ApprovalRole;
};

function assertManage(role: ApprovalRole) {
  assertCardAction({ role, action: "manage_pillars" });
}

export async function createEditorialPillar(
  supabase: SupabaseClient,
  actor: PillarActor,
  input: EditorialPillarInsert,
): Promise<EditorialPillar> {
  assertManage(actor.role);
  const existing = await editorialPillarRepository.listByClient(
    supabase,
    input.cadastro_cliente_id,
    false,
  );
  const ordem = input.ordem ?? existing.length;
  return editorialPillarRepository.insert(supabase, { ...input, ordem });
}

export async function updateEditorialPillar(
  supabase: SupabaseClient,
  actor: PillarActor,
  id: string,
  patch: Partial<EditorialPillarInsert>,
): Promise<EditorialPillar> {
  assertManage(actor.role);
  const pillar = await editorialPillarRepository.findById(supabase, id);
  if (!pillar) throw new Error("Pilar não encontrado");
  return editorialPillarRepository.update(supabase, id, patch);
}

export async function archiveEditorialPillar(
  supabase: SupabaseClient,
  actor: PillarActor,
  id: string,
): Promise<EditorialPillar> {
  assertManage(actor.role);
  const pillar = await editorialPillarRepository.findById(supabase, id);
  if (!pillar) throw new Error("Pilar não encontrado");
  return editorialPillarRepository.update(supabase, id, { ativo: false });
}

export async function reorderEditorialPillars(
  supabase: SupabaseClient,
  actor: PillarActor,
  cadastroClienteId: number,
  orderedIds: string[],
): Promise<EditorialPillar[]> {
  assertManage(actor.role);
  return editorialPillarRepository.reorder(supabase, cadastroClienteId, orderedIds);
}
