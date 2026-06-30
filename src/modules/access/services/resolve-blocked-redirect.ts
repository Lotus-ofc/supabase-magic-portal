/** Redirecionamento quando lifecycle bloqueia acesso à plataforma. */
export function resolveBlockedRedirect(
  effectiveStatus: string,
  hasSession = false,
): {
  to: string;
  search?: Record<string, string>;
  signOut?: boolean;
} {
  const status = effectiveStatus === "invite_expired" ? "invite_pending" : effectiveStatus;

  if (hasSession && (status === "invite_pending" || status === "awaiting_password")) {
    return { to: "/auth", search: { view: "set-password", context: "invite" } };
  }

  switch (status) {
    case "awaiting_password":
      return { to: "/auth", search: { view: "login" } };
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

/** @deprecated Use resolveBlockedRedirect */
export const resolveAccessBlockedRedirect = resolveBlockedRedirect;
