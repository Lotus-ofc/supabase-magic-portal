/**
 * @generated — derivado de tiktok.manifest.json. Não editar manualmente.
 */
import type { PluginRegistration } from "@/modules/platform-hub/ports";
import { TIKTOK_MANIFEST } from "./tiktok.manifest";
import { TiktokAdapter } from "./tiktok.adapter";

export function getPluginRegistration(): PluginRegistration {
  return { manifest: TIKTOK_MANIFEST, adapter: TiktokAdapter };
}
