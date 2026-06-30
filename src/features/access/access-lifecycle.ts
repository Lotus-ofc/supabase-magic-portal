import type { AccessLifecycleStatus, AuthUserSnapshot } from "./types";
import { isOnboardingComplete, parseLotsBiMetadata } from "./lots-bi-metadata";

const TRANSITIONS: Record<AccessLifecycleStatus, ReadonlySet<AccessLifecycleStatus>> = {
  invite_pending: new Set(["awaiting_password", "invite_expired", "revoked", "disabled"]),
  awaiting_password: new Set(["active", "invite_expired", "invite_pending", "revoked", "disabled"]),
  invite_expired: new Set(["invite_pending", "revoked", "disabled"]),
  active: new Set(["revoked", "disabled", "awaiting_password", "invite_pending"]),
  revoked: new Set(["active", "disabled", "invite_pending", "awaiting_password"]),
  disabled: new Set(["active", "invite_pending", "awaiting_password", "revoked"]),
};

export function canTransitionLifecycle(
  from: AccessLifecycleStatus,
  to: AccessLifecycleStatus,
): boolean {
  if (from === to) return true;
  return TRANSITIONS[from].has(to);
}

export function isUserBanned(authUser: Pick<AuthUserSnapshot, "banned_until">): boolean {
  if (!authUser.banned_until) return false;
  return new Date(authUser.banned_until).getTime() > Date.now();
}

/** Status efetivo considerando lifecycle Lots BI + sinais Auth. */
export function resolveEffectiveStatus(
  lifecycle: AccessLifecycleStatus,
  authUser: AuthUserSnapshot,
): AccessLifecycleStatus {
  const lotsBi = parseLotsBiMetadata(authUser.user_metadata);

  if (isUserBanned(authUser)) return "revoked";
  if (lifecycle === "disabled") return "disabled";
  if (lifecycle === "invite_expired") return "invite_expired";
  if (lifecycle === "invite_pending") return "invite_pending";

  if (lifecycle === "awaiting_password") return "awaiting_password";

  if (lifecycle === "active") {
    if (!isOnboardingComplete(lotsBi)) return "awaiting_password";
    return "active";
  }

  if (lifecycle === "revoked") return "revoked";

  return lifecycle;
}

export function canAccessPlatform(
  lifecycle: AccessLifecycleStatus,
  authUser: AuthUserSnapshot,
): boolean {
  return resolveEffectiveStatus(lifecycle, authUser) === "active";
}

export function inviteSentAt(authUser: AuthUserSnapshot): string | null {
  return authUser.confirmation_sent_at ?? authUser.invited_at ?? null;
}
