import type { PluginKey } from "../../../../../../contracts/plugin/capability.v1";
import type {
  CollectParamsV1,
  ProviderPortV1,
} from "../../../../../../contracts/provider/provider.v1";
import type {
  MetricsTimeseriesIngestEnvelopeV1,
  ProviderType,
} from "../../../../../../contracts/ingest/ingest-envelope.v1";
import type { MetricRowV1 } from "../../../../../../contracts/ingest/profiles/metrics-timeseries.v1";
import { METRIC_BATCH_CONTRACT_VERSION } from "../../../../../../contracts/ingest/profiles/metrics-timeseries.v1";

export interface FakeMetricsProviderConfig {
  pluginKey: PluginKey;
  platformLabel: string;
  providerType?: ProviderType;
  sampleRows?: readonly MetricRowV1[];
}

/**
 * Provider fake — retorna IngestEnvelope sem conhecer cliente, banco ou dashboard.
 * canonicalClientName é preenchido pelo collectIngestEnvelope via ConnectionResolver.
 */
export function createFakeMetricsProvider(config: FakeMetricsProviderConfig): ProviderPortV1 {
  const providerType = config.providerType ?? "make_passive";

  return {
    providerType,
    async collect(params: CollectParamsV1): Promise<MetricsTimeseriesIngestEnvelopeV1> {
      const today = new Date().toISOString().slice(0, 10);
      const window = params.window ?? { from: today, to: today };

      return {
        version: "1.0.0",
        connectionId: params.connectionId,
        pluginKey: config.pluginKey,
        providerType,
        profile: "metrics-timeseries",
        collectedAt: new Date().toISOString(),
        payload: {
          version: METRIC_BATCH_CONTRACT_VERSION,
          connectionId: params.connectionId,
          platformLabel: config.platformLabel,
          canonicalClientName: "",
          window,
          rows: [...(config.sampleRows ?? [{ metricKey: "impressions", value: 1, date: today }])],
          source: { pluginKey: config.pluginKey, providerType },
        },
      };
    },
  };
}
