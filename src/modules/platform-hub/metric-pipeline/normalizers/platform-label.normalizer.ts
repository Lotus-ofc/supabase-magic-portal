/** Normaliza platformLabel para gravação em base_metricas.plataforma. */
const PLATFORM_LABEL_MAP: Readonly<Record<string, string>> = {
  "meta ads": "Meta Ads",
  meta: "Meta Ads",
  meta_ads: "Meta Ads",
  "google ads": "Google Ads",
  google_ads: "Google Ads",
  "google analytics 4": "GA4",
  ga4: "GA4",
  instagram: "Instagram",
  "google business": "Google Business",
  google_business: "Google Business",
  tiktok: "TikTok",
  youtube: "YouTube",
  example: "Example",
};

export function normalizePlatformLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const mapped = PLATFORM_LABEL_MAP[trimmed.toLowerCase()];
  return mapped ?? trimmed;
}
