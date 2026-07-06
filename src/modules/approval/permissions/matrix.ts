import type { ApprovalRole, CardAction } from "../types/approval-role";

/** Matriz role × action — fonte única de verdade para permissões. */
export const PERMISSION_MATRIX: Record<ApprovalRole, ReadonlySet<CardAction>> = {
  admin: new Set([
    "view",
    "create",
    "edit",
    "move",
    "comment",
    "approve",
    "reject",
    "archive",
    "delete",
    "manage_pillars",
    "manage_stories",
  ]),
  social_media: new Set([
    "view",
    "create",
    "edit",
    "move",
    "comment",
    "manage_pillars",
    "manage_stories",
  ]),
  cliente: new Set(["view", "comment", "approve", "request_changes"]),
};

export function roleCan(role: ApprovalRole, action: CardAction): boolean {
  return PERMISSION_MATRIX[role]?.has(action) ?? false;
}
