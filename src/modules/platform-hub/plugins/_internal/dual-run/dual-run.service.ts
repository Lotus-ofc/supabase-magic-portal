import type { ConnectionId } from "../../../../../../contracts/connection/connection-id.v1";
import type { Capability } from "../../../../../../contracts/plugin/capability.v1";
import type { PlatformIdentityV1 } from "../../../../../../contracts/identity/platform-identity.v1";
import type { ProviderPortV1 } from "../../../../../../contracts/provider/provider.v1";
import type { ConnectionResolverPort } from "@/modules/platform-hub/connections/ports";
import { collectIngestEnvelope } from "../provider-framework";
import { isMetricsTimeseriesEnvelope } from "../../../../../../contracts/ingest/ingest-envelope.v1";
import {
  compareMetricRowSets,
  metricRowsToComparable,
  type DualRunReportV1,
} from "./compare-metric-rows";
import type { BaseMetricasRowV1 } from "@/modules/platform-hub/metric-pipeline/writers/map-to-base-metricas-rows";

export interface DualRunInputV1 {
  connectionId: ConnectionId;
  capability: Capability;
  identities: readonly PlatformIdentityV1[];
  resolver: ConnectionResolverPort;
  makeProvider: ProviderPortV1;
  officialProvider: ProviderPortV1;
  makeBaselineRows?: readonly BaseMetricasRowV1[];
  window?: { from: string; to: string };
}

export interface DualRunResultV1 {
  makeEnvelopeProfile: string | null;
  officialEnvelopeProfile: string | null;
  report: DualRunReportV1;
}

/** Executa Make vs Official sem alterar Runtime — comparação dual-run. */
export async function runDualRunComparison(input: DualRunInputV1): Promise<DualRunResultV1> {
  const collectArgs = {
    connectionId: input.connectionId,
    capability: input.capability,
    identities: input.identities,
    window: input.window,
  };

  const [makeEnvelope, officialEnvelope] = await Promise.all([
    collectIngestEnvelope({
      resolver: input.resolver,
      provider: input.makeProvider,
      ...collectArgs,
    }),
    collectIngestEnvelope({
      resolver: input.resolver,
      provider: input.officialProvider,
      ...collectArgs,
    }),
  ]);

  const baselineRows =
    input.makeBaselineRows ??
    (isMetricsTimeseriesEnvelope(makeEnvelope)
      ? metricRowsToComparable(makeEnvelope.payload.rows).map((row) => ({
          ...row,
          cliente: makeEnvelope.payload.canonicalClientName,
          plataforma: makeEnvelope.payload.platformLabel,
        }))
      : []);

  const candidateRows = isMetricsTimeseriesEnvelope(officialEnvelope)
    ? metricRowsToComparable(officialEnvelope.payload.rows).map((row) => ({
        ...row,
        cliente: officialEnvelope.payload.canonicalClientName,
        plataforma: officialEnvelope.payload.platformLabel,
      }))
    : [];

  const report = compareMetricRowSets(baselineRows, candidateRows, {
    baseline: "make",
    candidate: "official_api",
  });

  return {
    makeEnvelopeProfile: makeEnvelope.profile,
    officialEnvelopeProfile: officialEnvelope.profile,
    report,
  };
}
