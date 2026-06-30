import { resolveEffectiveStatus, isUserBanned } from "./access-lifecycle";
import { isOnboardingComplete, isPasswordSet, parseLotsBiMetadata } from "./lots-bi-metadata";
import type {
  AccessAuditRow,
  AccessLifecycleStatus,
  AuthUserSnapshot,
  ReconciliationResult,
} from "./types";

export function reconcileLifecycle(
  userId: string,
  currentStatus: AccessLifecycleStatus,
  authUser: AuthUserSnapshot,
): ReconciliationResult {
  const reasons: string[] = [];
  const lotsBi = parseLotsBiMetadata(authUser.user_metadata);
  let suggested = currentStatus;

  if (isUserBanned(authUser)) {
    if (suggested !== "revoked") {
      reasons.push("Usuário banido no Supabase Auth (banned_until).");
      suggested = "revoked";
    }
  } else if (currentStatus === "revoked" && !isUserBanned(authUser)) {
    reasons.push("Ban expirado ou removido no Supabase.");
    suggested = isOnboardingComplete(lotsBi) ? "active" : "awaiting_password";
  }

  if (currentStatus === "active" && !isOnboardingComplete(lotsBi)) {
    reasons.push("Lifecycle active mas onboarding metadata incompleto.");
    suggested = "awaiting_password";
  }

  if (
    (currentStatus === "invite_pending" || currentStatus === "awaiting_password") &&
    authUser.last_sign_in_at &&
    !isPasswordSet(lotsBi)
  ) {
    reasons.push("Sessão/login detectado sem password_set_at em metadata.");
    suggested = "awaiting_password";
  }

  if (
    currentStatus === "awaiting_password" &&
    isOnboardingComplete(lotsBi) &&
    !isUserBanned(authUser)
  ) {
    reasons.push("Metadata de onboarding completo.");
    suggested = "active";
  }

  if (
    currentStatus === "invite_pending" &&
    authUser.last_sign_in_at &&
    isOnboardingComplete(lotsBi)
  ) {
    reasons.push("Convite pendente inconsistente com onboarding completo.");
    suggested = "active";
  }

  suggested = resolveEffectiveStatus(suggested, authUser);

  return {
    user_id: userId,
    previous_status: currentStatus,
    suggested_status: suggested,
    changed: suggested !== currentStatus,
    reasons,
  };
}

export function lastAuthErrorFromAudit(rows: AccessAuditRow[]): string | null {
  const hit = rows.find((r) => r.action === "auth_error");
  return hit?.detail ?? null;
}

export function lastInviteResentAt(rows: AccessAuditRow[]): string | null {
  const resent = rows.filter((r) => r.action === "invite_resent");
  if (resent.length === 0) return null;
  return resent.reduce((a, b) => (a.created_at >= b.created_at ? a : b)).created_at;
}
