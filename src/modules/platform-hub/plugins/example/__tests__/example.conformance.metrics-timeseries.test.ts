import { describe, expect, it } from "vitest";
import { asConnectionId } from "../../../../../../contracts/connection/connection-id.v1";
import { METRIC_BATCH_CONTRACT_VERSION } from "../../../../../../contracts/ingest/profiles/metrics-timeseries.v1";
import { isMetricsTimeseriesEnvelope } from "../../../../../../contracts/ingest/ingest-envelope.v1";
import { ExampleAdapter } from "../example.adapter";
import { EXAMPLE_MANIFEST } from "../example.manifest";
import { EXAMPLE_CONNECTION_ID } from "../providers/fake.provider";

describe("example conformance: metrics-timeseries", () => {
  it("manifest declara perfil metrics-timeseries", () => {
    expect(EXAMPLE_MANIFEST.ingestProfiles).toContain("metrics-timeseries");
  });

  it("collect_returns_ingest_envelope", async () => {
    const adapter = new ExampleAdapter();
    const provider = adapter.getProvider("make_passive");
    const envelope = await provider.collect({
      connectionId: EXAMPLE_CONNECTION_ID,
      capability: "example:metrics:collect",
      identities: [],
    });
    expect(envelope.version).toBe("1.0.0");
    expect(envelope.connectionId).toBe(EXAMPLE_CONNECTION_ID);
  });

  it("envelope_profile_is_metrics_timeseries", async () => {
    const adapter = new ExampleAdapter();
    const envelope = await adapter.getProvider("make_passive").collect({
      connectionId: asConnectionId("00000000-0000-4000-8000-000000000002"),
      capability: "example:metrics:collect",
      identities: [],
    });
    expect(isMetricsTimeseriesEnvelope(envelope)).toBe(true);
  });

  it("metric_batch_schema_valid", async () => {
    const adapter = new ExampleAdapter();
    const envelope = await adapter.getProvider("make_passive").collect({
      connectionId: EXAMPLE_CONNECTION_ID,
      capability: "example:metrics:collect",
      identities: [],
    });
    if (!isMetricsTimeseriesEnvelope(envelope)) throw new Error("expected metrics-timeseries");
    expect(envelope.payload.version).toBe(METRIC_BATCH_CONTRACT_VERSION);
    expect(envelope.payload.rows.length).toBeGreaterThan(0);
    expect(envelope.payload.rows[0].metricKey).toBe("impressions");
  });

  it("adapter supports metrics capability", () => {
    const adapter = new ExampleAdapter();
    expect(adapter.supports("example:metrics:collect")).toBe(true);
  });
});
