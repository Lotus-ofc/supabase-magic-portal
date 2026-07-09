/**
 * @contract Capability v1.0.0
 * Capability namespaced: `{pluginKey}:{domain}:{action}`
 * Ex.: meta:metrics:collect, tiktok:content:publish_video
 */

export type Capability = `${string}:${string}:${string}`;

export const CAPABILITY_CONTRACT_VERSION = "1.0.0" as const;

export type PluginKey = string;
export type PluginKind = "platform" | "connector";

export interface MetricDefinitionV1 {
  key: string;
  format: "int" | "float" | "currency_micros";
  official: boolean;
}

export interface PluginManifestV1 {
  readonly version: "1.0.0";
  key: PluginKey;
  kind: PluginKind;
  label: string;
  category: string;
  capabilities: readonly Capability[];
  metrics: readonly MetricDefinitionV1[];
  oauth?: {
    type: string;
    scopes: readonly string[];
  };
  providers: {
    default: string;
    supported: readonly string[];
  };
  publisher: {
    supported: boolean;
  };
  identity: {
    types: readonly string[];
    primary: string;
  };
  health: {
    evaluators: readonly string[];
  };
  versions: readonly {
    provider: string;
    apiVersion: string;
    supportedUntil?: string;
  }[];
  /** Perfis de ingestão suportados pelo plugin. */
  ingestProfiles?: readonly ("metrics-timeseries" | "entity-upsert" | "event-log")[];
}
