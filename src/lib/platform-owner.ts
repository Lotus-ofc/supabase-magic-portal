/** Dono da plataforma — admin permanente; nunca revogar no banco nem na aplicação. */
export const PLATFORM_OWNER_EMAIL = "leandromajr@gmail.com";

export function isPlatformOwnerEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === PLATFORM_OWNER_EMAIL.toLowerCase();
}
