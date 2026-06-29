/** Lots BI — identidade visual e metadados da plataforma. */
export const BRAND_NAME = "Lots BI";
export const BRAND_NAME_SHORT = "Lots BI";
export const BRAND_TAGLINE = "Business Intelligence para marketing digital";
export const BRAND_DESCRIPTION =
  "Lots BI — plataforma de inteligência de negócios para consolidar métricas, clientes e operações de marketing.";

export const BRAND_COLORS = {
  purple: "#A855F7",
  blue: "#60A5FA",
  slate: "#334155",
  background: "#000000",
} as const;

export const BRAND_ASSETS = {
  icon: "/brand/logo-icon.png",
  logoFull: "/brand/logo-full.png",
  logoBi: "/brand/logo-bi.png",
  logoLots: "/brand/logo-lots.png",
  favicon: "/favicon.png",
  ogImage: "/og-image.png",
} as const;

/** Título de aba: `section` · Lots BI */
export function brandTitle(section: string): string {
  return `${section} · ${BRAND_NAME}`;
}

/** Título de aba admin: `section` · Admin · Lots BI */
export function adminTitle(section: string): string {
  return `${section} · Admin · ${BRAND_NAME}`;
}
