// ============================================================================
// Lotus · Registry of PlatformDefs.
// Adicionar LinkedIn / TikTok / Pinterest / etc = importar + adicionar aqui.
// ============================================================================

import type { PlatformDef } from "./types";
import { googleAdsDef } from "./google-ads";
import { metaAdsDef } from "./meta-ads";
import { instagramDef } from "./instagram";
import { ga4Def } from "./ga4";

export const PLATFORM_REGISTRY: Record<string, PlatformDef> = {
  google_ads: googleAdsDef,
  meta_ads: metaAdsDef,
  instagram: instagramDef,
  ga4: ga4Def,
};

export const PLATFORMS = Object.values(PLATFORM_REGISTRY);

export function getPlatformDef(key: string): PlatformDef | undefined {
  return PLATFORM_REGISTRY[key];
}
