/**
 * @contract RegistryReport v1.0.0
 * @see contracts/governance/contract.meta.json
 *
 * Schema do artefato scripts/generated/registry-report.json (gerado em prebuild, Fase -1+).
 */

import type { Capability } from "../plugin/capability.v1";

export const REGISTRY_REPORT_CONTRACT_VERSION = "1.0.0" as const;

export interface RegistryReportPluginV1 {
  key: string;
  capabilities: Capability[];
  providers: string[];
  ingestProfiles?: string[];
}

export interface RegistryReportApiVersionV1 {
  plugin: string;
  version: string;
  expiresIn?: string;
}

export interface RegistryReportOrphansV1 {
  plugins: string[];
  capabilities: Capability[];
  metrics: string[];
}

export interface RegistryReportV1 {
  readonly contractVersion: typeof REGISTRY_REPORT_CONTRACT_VERSION;
  generatedAt: string;
  plugins: RegistryReportPluginV1[];
  capabilities: Capability[];
  providers: string[];
  metricDefinitions: Array<{ plugin: string; key: string; format: string }>;
  apiVersions: RegistryReportApiVersionV1[];
  healthEvaluators: Array<{ plugin: string; key: string }>;
  publishers: Array<{ plugin: string; supported: boolean }>;
  oauthTypes: string[];
  writers: string[];
  orphans: RegistryReportOrphansV1;
}
