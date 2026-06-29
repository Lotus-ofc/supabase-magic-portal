/** Lots BI — identidade visual e metadados da plataforma. */
export const BRAND_NAME = "Lots BI";
export const BRAND_NAME_SHORT = "Lots BI";
export const BRAND_TAGLINE = "Business Intelligence para marketing digital";
export const BRAND_DESCRIPTION =
  "Lots BI — plataforma de inteligência de negócios para consolidar métricas, clientes e operações de marketing.";

const SUPABASE_MEDIA_BASE =
  "https://ywvhoctcmibjitvwkkhb.supabase.co/storage/v1/object/public/Midias";

export const BRAND_COLORS = {
  purple: "#A855F7",
  blue: "#60A5FA",
  /** Cor do texto "Lots" no lockup (extraída do asset oficial). */
  lotsText: "#2C2E3B",
  slate: "#334155",
  background: "#000000",
} as const;

/** Mídias oficiais hospedadas no Supabase Storage (bucket `Midias`). */
export const BRAND_ASSETS = {
  /** Lockup horizontal completo (símbolo + Lots + BI). */
  logoFull: `${SUPABASE_MEDIA_BASE}/1.png`,
  /** Símbolo / pétala (favicon, ícone compacto). */
  icon: `${SUPABASE_MEDIA_BASE}/Logo%20SVG/2.svg`,
  /** Letras BI com gradiente. */
  logoBi: `${SUPABASE_MEDIA_BASE}/3.png`,
  /** Palavra Lots (referência; no UI usamos texto tipográfico). */
  logoLots: `${SUPABASE_MEDIA_BASE}/4.png`,
  favicon: `${SUPABASE_MEDIA_BASE}/2.png`,
  ogImage: `${SUPABASE_MEDIA_BASE}/1.png`,
} as const;

/** Título de aba: `section` · Lots BI */
export function brandTitle(section: string): string {
  return `${section} · ${BRAND_NAME}`;
}

/** Título de aba admin: `section` · Admin · Lots BI */
export function adminTitle(section: string): string {
  return `${section} · Admin · ${BRAND_NAME}`;
}
