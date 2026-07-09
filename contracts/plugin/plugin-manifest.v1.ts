/**
 * @contract PluginManifest v1.0.0
 * @see contracts/plugin/contract.meta.json
 */

export type {
  Capability,
  MetricDefinitionV1,
  PluginKey,
  PluginKind,
  PluginManifestV1,
} from "./capability.v1";

export { CAPABILITY_CONTRACT_VERSION } from "./capability.v1";

export const PLUGIN_MANIFEST_CONTRACT_VERSION = "1.0.0" as const;
