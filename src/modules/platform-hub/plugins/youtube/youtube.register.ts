/**
 * @generated — derivado de youtube.manifest.json. Não editar manualmente.
 */
import type { PluginRegistration } from "@/modules/platform-hub/ports";
import { YOUTUBE_MANIFEST } from "./youtube.manifest";
import { YoutubeAdapter } from "./youtube.adapter";

export function getPluginRegistration(): PluginRegistration {
  return { manifest: YOUTUBE_MANIFEST, adapter: YoutubeAdapter };
}
