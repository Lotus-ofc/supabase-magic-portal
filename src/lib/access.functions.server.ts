/**
 * Access API — barrel de compatibilidade.
 * Implementação em `src/modules/access/*.server.ts`.
 */
export {
  recordAccessAuditEntry,
  ensureAccessAccountRow,
} from "@/modules/access/internal/access-db.server";

export { assertAccessActive } from "@/modules/access/gate.server";

export {
  getAuthModuleVersion,
  getUserAccessProfile,
  listUserAccessProfiles,
  transitionUserLifecycle,
  reconcileUserAccess,
  getUserAccessAuditLog,
} from "@/modules/access/admin-profiles.server";

export {
  postAuthOnCallbackCompleted,
  postAuthOnInvitePasswordSet,
  postAuthOnRecoveryCompleted,
  postAuthOnPasswordChangedByUser,
  postAuthOnLoginSuccess,
} from "@/modules/access/post-auth.server";

export { performAccessRecovery, applyRecoveryAction } from "@/modules/access/recovery.server";
export type { AccessRecoveryAction } from "@/modules/access/recovery-actions";
