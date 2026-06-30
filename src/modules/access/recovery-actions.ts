/** Contrato fechado do Recovery Mode (Admin). */
export type AccessRecoveryAction =
  | "resend_invite"
  | "force_password_reset"
  | "invalidate_sessions"
  | "reactivate"
  | "revoke"
  | "disable"
  | "delete_user";

export const ACCESS_RECOVERY_ACTIONS = [
  "resend_invite",
  "force_password_reset",
  "invalidate_sessions",
  "reactivate",
  "revoke",
  "disable",
  "delete_user",
] as const satisfies readonly AccessRecoveryAction[];
