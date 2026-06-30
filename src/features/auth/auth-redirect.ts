/** Destino pós-login quando o usuário já está ativo na plataforma. */
export function resolvePostAuthPath(isAdmin: boolean, redirectTo?: string | null): string {
  if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
    return redirectTo;
  }
  return isAdmin ? "/admin" : "/dashboard";
}

/** Rota de auth para usuário bloqueado pelo lifecycle. */
export function resolveAccessBlockedRedirect(effectiveStatus: string): {
  to: string;
  search?: Record<string, string>;
  signOut?: boolean;
} {
  switch (effectiveStatus) {
    case "awaiting_password":
      return { to: "/auth", search: { view: "set-password", context: "invite" } };
    case "invite_pending":
    case "invite_expired":
      return {
        to: "/auth",
        search: { view: "link-error", error: "Convite inválido ou expirado." },
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
