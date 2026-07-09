/**
 * @generated — derivado de google_business.manifest.json. Não editar manualmente.
 */
import type { PluginRegistration } from "@/modules/platform-hub/ports";
import { GOOGLE_BUSINESS_MANIFEST } from "./google_business.manifest";
import { GoogleBusinessAdapter } from "./google_business.adapter";

export function getPluginRegistration(): PluginRegistration {
  return { manifest: GOOGLE_BUSINESS_MANIFEST, adapter: GoogleBusinessAdapter };
}
