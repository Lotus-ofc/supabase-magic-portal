/**
 * Platform Hub — Engineering Contracts v1.0.0
 * @see docs/02-architecture/engineering-contracts.md
 */

export * from "./connection/connection-id.v1";
export * from "./connection/scope-ref.v1";
export * from "./plugin/plugin-manifest.v1";
export * from "./plugin/capability.v1";
export * from "./ingest/ingest-envelope.v1";
export * from "./ingest/profiles/metrics-timeseries.v1";
export * from "./provider/provider.v1";
export * from "./identity/platform-identity.v1";
export * from "./credential/credential-vault.v1";
export * from "./events/integration-events.v1";
export * from "./health/reconciliation.v1";
export * from "./health/health-snapshot.v1";
export * from "./health/health-signal.v1";
export * from "./runtime/sync-runtime.v1";
export * from "./runtime/execution-context.v1";
export * from "./runtime/execution-result.v1";
export * from "./governance/registry-report.v1";
export * from "./governance/conformance-suites.v1";

export const CONTRACTS_BUNDLE_VERSION = "1.0.0" as const;
