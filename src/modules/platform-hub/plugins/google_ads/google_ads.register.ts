/**
 * @generated — derivado de google_ads.manifest.json. Não editar manualmente.
 */
import type { PluginRegistration } from "@/modules/platform-hub/ports";
import { GOOGLE_ADS_MANIFEST } from "./google_ads.manifest";
import { GoogleAdsAdapter } from "./google_ads.adapter";

export function getPluginRegistration(): PluginRegistration {
  return { manifest: GOOGLE_ADS_MANIFEST, adapter: GoogleAdsAdapter };
}
