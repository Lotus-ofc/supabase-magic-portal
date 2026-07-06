/** Contrato fechado do Recovery Mode (Admin) — operações diárias. */
export type AccessRecoveryAction = "resend_invite" | "force_password_reset" | "delete_user";

export const ACCESS_RECOVERY_ACTIONS = [
  "resend_invite",
  "force_password_reset",
  "delete_user",
] as const satisfies readonly AccessRecoveryAction[];
