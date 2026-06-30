/** Destino pós-login quando o usuário já está ativo na plataforma. */
export function resolvePostAuthPath(isAdmin: boolean, redirectTo?: string | null): string {
  if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
    return redirectTo;
  }
  return isAdmin ? "/admin" : "/dashboard";
}

/** Redirecionamento quando lifecycle bloqueia acesso à plataforma. */
export function resolveAccessBlockedRedirect(
  effectiveStatus: string,
  hasSession = false,
): {
  to: string;
  search?: Record<string, string>;
  signOut?: boolean;
} {
  if (
    hasSession &&
    (effectiveStatus === "invite_pending" || effectiveStatus === "awaiting_password")
  ) {
    return { to: "/auth", search: { view: "set-password", context: "invite" } };
  }

  switch (effectiveStatus) {
    case "awaiting_password":
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
      return {
        to: "/auth",
        search: { view: "link-error", error: "Acesso não autorizado." },
        signOut: true,
      };
  }
}
