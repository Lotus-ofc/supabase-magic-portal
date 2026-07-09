/**
 * @generated — derivado de ga4.manifest.json. Não editar manualmente.
 */
import type { PluginRegistration } from "@/modules/platform-hub/ports";
import { GA4_MANIFEST } from "./ga4.manifest";
import { Ga4Adapter } from "./ga4.adapter";

export function getPluginRegistration(): PluginRegistration {
  return { manifest: GA4_MANIFEST, adapter: Ga4Adapter };
}
