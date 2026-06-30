import { canAccessPlatform, inviteSentAt, resolveEffectiveStatus } from "./access-lifecycle";
import { lastAuthErrorFromAudit, lastInviteResentAt } from "./access-reconciliation";
import { parseLotsBiMetadata } from "./lots-bi-metadata";
import type {
  AccessAccountRow,
  AccessAuditRow,
  AuthUserSnapshot,
  UserAccessProfile,
} from "./types";

export interface AssembleProfileInput {
  authUser: AuthUserSnapshot;
  accessAccount: AccessAccountRow | null;
  roles: string[];
  clientes: string[];
  nome: string | null;
  auditRows: AccessAuditRow[];
}

export function assembleUserAccessProfile(input: AssembleProfileInput): UserAccessProfile {
  const { authUser, accessAccount, roles, clientes, nome, auditRows } = input;
  const lifecycle = accessAccount?.lifecycle_status ?? "invite_pending";
  const lotsBi = parseLotsBiMetadata(authUser.user_metadata);
  const effective = resolveEffectiveStatus(lifecycle, authUser);
  const isAdmin = roles.includes("admin");

  return {
    id: authUser.id,
    email: authUser.email ?? "",
    nome,
    created_at: authUser.created_at,
    lifecycle_status: lifecycle,
    effective_status: effective,
    blocked_reason: accessAccount?.blocked_reason ?? null,
    tipo: isAdmin ? "admin" : "cliente",
    clientes,
    invite_sent_at: inviteSentAt(authUser),
    invite_last_resent_at: lastInviteResentAt(auditRows),
    password_set_at: lotsBi.password_set_at ?? null,
    onboarding_completed_at: lotsBi.onboarding_completed_at ?? null,
    last_sign_in_at: authUser.last_sign_in_at,
    is_banned: Boolean(
      authUser.banned_until && new Date(authUser.banned_until).getTime() > Date.now(),
    ),
    last_auth_error: lastAuthErrorFromAudit(auditRows),
    can_access_platform: canAccessPlatform(lifecycle, authUser),
  };
}

export function authUserFromSupabase(user: {
  id: string;
  email?: string | null;
  created_at?: string;
  last_sign_in_at?: string | null;
  invited_at?: string | null;
  confirmation_sent_at?: string | null;
  email_confirmed_at?: string | null;
  banned_until?: string | null;
  user_metadata?: Record<string, unknown>;
}): AuthUserSnapshot {
  return {
    id: user.id,
    email: user.email ?? null,
    created_at: user.created_at ?? new Date(0).toISOString(),
    last_sign_in_at: user.last_sign_in_at ?? null,
    invited_at: user.invited_at ?? null,
    confirmation_sent_at: user.confirmation_sent_at ?? null,
    email_confirmed_at: user.email_confirmed_at ?? null,
    banned_until: user.banned_until ?? null,
    user_metadata: user.user_metadata ?? {},
  };
}
