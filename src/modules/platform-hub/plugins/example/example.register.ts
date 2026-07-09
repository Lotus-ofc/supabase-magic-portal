/**
 * @generated — derivado de example.manifest.json. Não editar manualmente.
 */
import type { PluginRegistration } from "@/modules/platform-hub/ports";
import { EXAMPLE_MANIFEST } from "./example.manifest";
import { ExampleAdapter } from "./example.adapter";

export function getPluginRegistration(): PluginRegistration {
  return { manifest: EXAMPLE_MANIFEST, adapter: new ExampleAdapter() };
}
