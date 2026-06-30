import type { Session } from "@supabase/supabase-js";
import { needsOnboardingStep, needsPasswordStep } from "@/features/auth/auth-callback-inference";

/** Destino pós-login quando o usuário já está ativo na plataforma. */
export function resolvePostAuthPath(isAdmin: boolean, redirectTo?: string | null): string {
  if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
    return redirectTo;
  }
  return isAdmin ? "/admin" : "/dashboard";
}

export interface AccessBlockedOptions {
  hasSession?: boolean;
  session?: Session | null;
}

/** Rota de auth para usuário bloqueado pelo lifecycle — conduz onboarding, nunca link-error cedo. */
export function resolveAccessBlockedRedirect(
  effectiveStatus: string,
  options: AccessBlockedOptions = {},
): {
  to: string;
  search?: Record<string, string>;
  signOut?: boolean;
} {
  const { hasSession = false, session = null } = options;
  const needsPassword = session ? needsPasswordStep(session) : false;
  const needsOnboarding = session ? needsOnboardingStep(session) : false;

  if (hasSession && (needsPassword || needsOnboarding)) {
    if (needsPassword) {
      return { to: "/auth", search: { view: "set-password", context: "invite" } };
    }
    return { to: "/auth", search: { view: "onboarding" } };
  }

  switch (effectiveStatus) {
    case "awaiting_password":
      if (hasSession) {
        if (needsPassword) {
          return { to: "/auth", search: { view: "set-password", context: "invite" } };
        }
        if (needsOnboarding) {
          return { to: "/auth", search: { view: "onboarding" } };
        }
      }
      return { to: "/auth", search: { view: "set-password", context: "invite" } };
    case "invite_pending":
      if (hasSession) {
        return { to: "/auth", search: { view: "set-password", context: "invite" } };
      }
      return {
        to: "/auth",
        search: {
          view: "link-error",
          error: "Convite inválido ou expirado. Solicite um novo convite ao administrador.",
        },
        signOut: true,
      };
    case "invite_expired":
      return {
        to: "/auth",
        search: {
          view: "link-error",
          error: "Convite expirado. Use Recovery Mode no admin para reenviar.",
        },
        signOut: true,
      };
    case "revoked":
      return {
        to: "/auth",
        search: { view: "link-error", error: "Seu acesso foi revogado." },
        signOut: true,
      };
    case "disabled":
      return {
        to: "/auth",
        search: { view: "link-error", error: "Sua conta está desativada." },
        signOut: true,
      };
    default:
      if (hasSession && needsPassword) {
        return { to: "/auth", search: { view: "set-password", context: "invite" } };
      }
      return {
        to: "/auth",
        search: { view: "link-error", error: "Acesso não autorizado." },
        signOut: true,
      };
  }
}
