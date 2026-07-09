/** Navega para redirect interno pós-OAuth (suporta query strings). */
export function navigateOAuthRedirect(redirectAfter: string): void {
  window.location.assign(redirectAfter);
}
