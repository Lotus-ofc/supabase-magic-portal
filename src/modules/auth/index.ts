export {
  parseAuthCallbackParams,
  hasLegacyAuthTokensOnAuthRoute,
  resolveCallbackFlow,
  resolvePostCallbackRedirect,
  type AuthCallbackParams,
  type AuthCallbackType,
  type AuthFlow,
} from "@/features/auth/auth-callback";
export {
  completeAuthCallback,
  waitForPasswordRecoveryEvent,
  type AuthCallbackResult,
} from "@/features/auth/auth-callback-handler";
export { AuthBootstrapping, AuthShell } from "@/features/auth/auth-shell";
export {
  authSearchSchema,
  resolveAuthView,
  isSetPasswordView,
  type AuthSearch,
  type AuthView,
  type SetPasswordContext,
} from "@/features/auth/auth-views";
export {
  authCallbackSearchSchema,
  type AuthCallbackSearch,
} from "@/features/auth/auth-callback-search";
export { useSignOut } from "@/features/auth/use-sign-out";
export { validatePasswordPair } from "./validation/password";
