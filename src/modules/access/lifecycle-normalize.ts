import type { AccessLifecycleStatus } from "@/features/access/types";

/** Estados fechados do contrato Auth Fase 1. */
export const LIFECYCLE_STATUSES = [
  "invite_pending",
  "awaiting_password",
  "active",
  "disabled",
  "revoked",
] as const satisfies readonly AccessLifecycleStatus[];

/** Legado DB: invite_expired → invite_pending. */
export function normalizeLifecycleStatus(raw: string): AccessLifecycleStatus {
  if (raw === "invite_expired") return "invite_pending";
  return raw as AccessLifecycleStatus;
}
