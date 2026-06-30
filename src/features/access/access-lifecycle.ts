import type { AccessLifecycleStatus, AuthUserSnapshot } from "./types";
import { isOnboardingComplete, parseLotsBiMetadata } from "./lots-bi-metadata";
import { normalizeLifecycleStatus } from "@/modules/access/lifecycle-normalize";

const TRANSITIONS: Record<AccessLifecycleStatus, ReadonlySet<AccessLifecycleStatus>> = {
  invite_pending: new Set(["awaiting_password", "revoked", "disabled"]),
  awaiting_password: new Set(["active", "invite_pending", "revoked", "disabled"]),
  active: new Set(["revoked", "disabled", "awaiting_password", "invite_pending"]),
  revoked: new Set(["active", "disabled", "invite_pending", "awaiting_password"]),
  disabled: new Set(["active", "invite_pending", "awaiting_password", "revoked"]),
};

export function canTransitionLifecycle(
  from: AccessLifecycleStatus,
  to: AccessLifecycleStatus,
): boolean {
  const normalizedFrom = normalizeLifecycleStatus(from);
  const normalizedTo = normalizeLifecycleStatus(to);
  if (normalizedFrom === normalizedTo) return true;
  return TRANSITIONS[normalizedFrom].has(normalizedTo);
}

export function isUserBanned(authUser: Pick<AuthUserSnapshot, "banned_until">): boolean {
  if (!authUser.banned_until) return false;
  return new Date(authUser.banned_until).getTime() > Date.now();
}

/** Status efetivo considerando lifecycle Lots BI + sinais Auth. */
export function resolveEffectiveStatus(
  lifecycle: AccessLifecycleStatus | string,
  authUser: AuthUserSnapshot,
): AccessLifecycleStatus {
  const normalized = normalizeLifecycleStatus(lifecycle);
  const lotsBi = parseLotsBiMetadata(authUser.user_metadata);

  if (isUserBanned(authUser)) return "revoked";
  if (normalized === "disabled") return "disabled";
  if (normalized === "invite_pending") return "invite_pending";
  if (normalized === "awaiting_password") return "awaiting_password";

  if (normalized === "active") {
    if (!isOnboardingComplete(lotsBi)) return "awaiting_password";
    return "active";
  }

  if (normalized === "revoked") return "revoked";

  return normalized;
}

export function canAccessPlatform(
  lifecycle: AccessLifecycleStatus | string,
  authUser: AuthUserSnapshot,
): boolean {
  return resolveEffectiveStatus(lifecycle, authUser) === "active";
}

export function inviteSentAt(authUser: AuthUserSnapshot): string | null {
  return authUser.confirmation_sent_at ?? authUser.invited_at ?? null;
}
