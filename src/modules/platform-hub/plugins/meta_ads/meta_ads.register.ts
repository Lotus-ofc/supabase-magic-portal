/**
 * @generated — derivado de meta_ads.manifest.json. Não editar manualmente.
 */
import type { PluginRegistration } from "@/modules/platform-hub/ports";
import { META_ADS_MANIFEST } from "./meta_ads.manifest";
import { MetaAdsAdapter } from "./meta_ads.adapter";

export function getPluginRegistration(): PluginRegistration {
  return { manifest: META_ADS_MANIFEST, adapter: MetaAdsAdapter };
}
