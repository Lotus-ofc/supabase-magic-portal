import type { SupabaseClient } from "@supabase/supabase-js";
import { storyPlanRowRepository } from "../repositories/story-plan-row.repository.server";
import type { StoryPlanRow, StoryPlanRowInsert } from "../types/story-plan-row";
import type { ApprovalRole } from "../types/approval-role";
import { assertCardAction } from "../permissions/resolve-card-action";

export type StoryActor = {
  userId: string;
  email: string | null;
  role: ApprovalRole;
};

function assertManage(role: ApprovalRole) {
  assertCardAction({ role, action: "manage_stories" });
}

export async function createStoryPlanRow(
  supabase: SupabaseClient,
  actor: StoryActor,
  input: StoryPlanRowInsert,
): Promise<StoryPlanRow> {
  assertManage(actor.role);
  return storyPlanRowRepository.insert(supabase, {
    ...input,
    created_by: actor.userId,
    checklist: input.checklist ?? [],
  });
}

export async function updateStoryPlanRow(
  supabase: SupabaseClient,
  actor: StoryActor,
  id: string,
  patch: Partial<StoryPlanRowInsert>,
): Promise<StoryPlanRow> {
  assertManage(actor.role);
  const row = await storyPlanRowRepository.findById(supabase, id);
  if (!row) throw new Error("Linha do plano não encontrada");
  return storyPlanRowRepository.update(supabase, id, patch);
}

export async function deleteStoryPlanRow(
  supabase: SupabaseClient,
  actor: StoryActor,
  id: string,
): Promise<void> {
  assertManage(actor.role);
  const row = await storyPlanRowRepository.findById(supabase, id);
  if (!row) throw new Error("Linha do plano não encontrada");
  await storyPlanRowRepository.delete(supabase, id);
}
