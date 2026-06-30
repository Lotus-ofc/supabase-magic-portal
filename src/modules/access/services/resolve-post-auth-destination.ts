/** Destino pós-login autorizado — somente Access decide admin vs dashboard. */
export function resolvePostAuthDestination(isAdmin: boolean, redirectTo?: string | null): string {
  if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
    return redirectTo;
  }
  return isAdmin ? "/admin" : "/dashboard";
}

/** @deprecated Use resolvePostAuthDestination */
export const resolvePostAuthPath = resolvePostAuthDestination;
