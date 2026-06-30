/** Módulo Auth + Gestão de Acessos Lots BI v2.1 */

export const AUTH_MODULE_VERSION = "2.1";

export type AccessLifecycleStatus =
  | "invite_pending"
  | "awaiting_password"
  | "invite_expired"
  | "active"
  | "revoked"
  | "disabled";

export type AccessAuditAction =
  | "invite_sent"
  | "invite_resent"
  | "invite_cancelled"
  | "invite_accepted"
  | "first_access_completed"
  | "password_changed"
  | "password_reset_requested"
  | "password_reset_completed"
  | "access_revoked"
  | "access_reactivated"
  | "access_disabled"
  | "user_deleted"
  | "profile_changed"
  | "client_changed"
  | "sessions_revoked"
  | "lifecycle_reconciled"
  | "metadata_revalidated"
  | "onboarding_restarted"
  | "auth_error";

export interface LotsBiUserMetadata {
  password_set_at?: string;
  onboarding_completed_at?: string;
}

export interface AccessAccountRow {
  user_id: string;
  lifecycle_status: AccessLifecycleStatus;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccessAuditRow {
  id: string;
  user_id: string;
  actor_id: string | null;
  action: AccessAuditAction | string;
  detail: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Subset estável de auth.users (Admin API / JWT) — sem espelhar no Postgres. */
export interface AuthUserSnapshot {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  invited_at: string | null;
  confirmation_sent_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
  user_metadata: Record<string, unknown>;
}

export interface UserAccessProfile {
  id: string;
  email: string;
  nome: string | null;
  created_at: string;
  lifecycle_status: AccessLifecycleStatus;
  effective_status: AccessLifecycleStatus;
  blocked_reason: string | null;
  tipo: "admin" | "cliente";
  clientes: string[];
  invite_sent_at: string | null;
  invite_last_resent_at: string | null;
  password_set_at: string | null;
  onboarding_completed_at: string | null;
  last_sign_in_at: string | null;
  is_banned: boolean;
  last_auth_error: string | null;
  can_access_platform: boolean;
}

export interface ReconciliationResult {
  user_id: string;
  previous_status: AccessLifecycleStatus;
  suggested_status: AccessLifecycleStatus;
  changed: boolean;
  reasons: string[];
}
