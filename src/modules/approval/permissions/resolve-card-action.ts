import type { ApprovalRole, CardAction } from "../types/approval-role";
import { roleCan } from "./matrix";

export type ResolveCardActionInput = {
  role: ApprovalRole;
  action: CardAction;
  isOwner?: boolean;
};

export function resolveCardAction(input: ResolveCardActionInput): boolean {
  if (input.isOwner && input.role === "admin") return true;
  return roleCan(input.role, input.action);
}

export function assertCardAction(input: ResolveCardActionInput): void {
  if (!resolveCardAction(input)) {
    throw new Error(`Forbidden: role ${input.role} cannot ${input.action}`);
  }
}
