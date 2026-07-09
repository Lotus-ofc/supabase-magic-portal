/**
 * @contract ConformanceSuites v1.0.0
 * @see contracts/governance/contract.meta.json
 *
 * Suites obrigatórias por perfil — substituem golden tests únicos (v3.3).
 */

export const CONFORMANCE_SUITES_CONTRACT_VERSION = "1.0.0" as const;

export type ConformanceSuiteIdV1 = "metrics-timeseries" | "publish" | "webhook";

export interface ConformanceSuiteSpecV1 {
  id: ConformanceSuiteIdV1;
  /** Testes mínimos que a suite deve cobrir. */
  requiredChecks: readonly string[];
  /** Condição de obrigatoriedade baseada no manifest. */
  requiredWhen: string;
}

export const CONFORMANCE_SUITES_V1: readonly ConformanceSuiteSpecV1[] = [
  {
    id: "metrics-timeseries",
    requiredChecks: [
      "collect_returns_ingest_envelope",
      "envelope_profile_is_metrics_timeseries",
      "metric_batch_schema_valid",
      "writer_port_mock_called",
      "registry_registers_plugin",
    ],
    requiredWhen: "manifest.ingestProfiles includes metrics-timeseries",
  },
  {
    id: "publish",
    requiredChecks: ["supports_publish_capability", "publish_transport_mock"],
    requiredWhen: "manifest.publisher.supported === true",
  },
  {
    id: "webhook",
    requiredChecks: ["receive_webhook_envelope", "webhook_capability_declared"],
    requiredWhen: "manifest.capabilities includes *:webhook:*",
  },
] as const;

export interface ConformanceSuiteResultV1 {
  suiteId: ConformanceSuiteIdV1;
  pluginKey: string;
  passed: boolean;
  failures: string[];
}
