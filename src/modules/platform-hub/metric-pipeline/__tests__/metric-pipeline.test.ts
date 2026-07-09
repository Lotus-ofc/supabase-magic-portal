import { describe, expect, it } from "vitest";
import { asConnectionId } from "../../../../../contracts/connection/connection-id.v1";
import { asScopeRef } from "../../../../../contracts/connection/scope-ref.v1";
import { isMetricsTimeseriesEnvelope } from "../../../../../contracts/ingest/ingest-envelope.v1";
import { createFakeMetricsProvider } from "../../plugins/_internal/provider-framework";
import { createMetricPipelineStack } from "../create-metric-pipeline-stack";
import { normalizeMetricBatch, normalizeSpendValue } from "../normalizers";

describe("Metric Pipeline", () => {
  it("accept — normaliza e grava em BaseMetricasWriter in-memory", async () => {
    const { metricPipeline, writer } = createMetricPipelineStack();
    const provider = createFakeMetricsProvider({
      pluginKey: "example",
      platformLabel: "meta",
    });

    const envelope = await provider.collect({
      connectionId: asConnectionId("00000000-0000-4000-8000-000000000099"),
      capability: "example:metrics:collect",
      identities: [],
    });
    envelope.payload.canonicalClientName = "acme_corp";

    const result = await metricPipeline.accept(envelope);

    expect(result.accepted).toBe(true);
    expect(result.writerResults[0]?.rowsWritten).toBe(1);
    expect(writer.snapshot()[0]?.cliente).toBe("acme_corp");
    expect(writer.snapshot()[0]?.plataforma).toBe("Meta Ads");
  });

  it("rejeita perfil não metrics-timeseries", async () => {
    const { metricPipeline } = createMetricPipelineStack();
    const result = await metricPipeline.accept({
      version: "1.0.0",
      connectionId: asConnectionId("00000000-0000-4000-8000-000000000099"),
      pluginKey: "example",
      providerType: "make_passive",
      profile: "entity-upsert" as "metrics-timeseries",
      collectedAt: new Date().toISOString(),
      payload: {},
    });
    expect(result.accepted).toBe(false);
  });

  it("normalizers — spend micros", () => {
    expect(normalizeSpendValue("spend", 2_500_000)).toBe(2.5);
    expect(normalizeSpendValue("impressions", 2_500_000)).toBe(2_500_000);
  });

  it("normalizers — metric batch completo", () => {
    const batch = normalizeMetricBatch({
      version: "1.0.0",
      connectionId: asConnectionId("00000000-0000-4000-8000-000000000099"),
      platformLabel: "google_ads",
      canonicalClientName: "  acme  ",
      window: { from: "2026-07-01", to: "2026-07-01" },
      rows: [{ metricKey: " Spend ", value: 5_000_000, date: "2026-07-01" }],
      source: { pluginKey: "google_ads", providerType: "official_api" },
    });

    expect(batch.platformLabel).toBe("Google Ads");
    expect(batch.canonicalClientName).toBe("acme");
    expect(batch.rows[0]?.metricKey).toBe("spend");
    expect(batch.rows[0]?.value).toBe(5);
    expect(batch.normalizedAt).toBeTruthy();
  });

  it("audit — registra escrita", async () => {
    const { metricPipeline, auditRepository } = createMetricPipelineStack();
    const provider = createFakeMetricsProvider({ pluginKey: "example", platformLabel: "example" });
    const connectionId = asConnectionId("00000000-0000-4000-8000-000000000099");
    const envelope = await provider.collect({
      connectionId,
      capability: "example:metrics:collect",
      identities: [],
    });
    envelope.payload.canonicalClientName = "client";

    await metricPipeline.accept(envelope);
    const audit = await auditRepository.listByConnection(connectionId);
    expect(audit).toHaveLength(1);
    expect(audit[0]?.rowsWritten).toBe(1);
  });

  it("replay — re-feed envelopes históricos", async () => {
    const { metricPipeline, replayService, writer } = createMetricPipelineStack();
    const provider = createFakeMetricsProvider({ pluginKey: "example", platformLabel: "example" });
    const connectionId = asConnectionId("00000000-0000-4000-8000-000000000099");
    const envelope = await provider.collect({
      connectionId,
      capability: "example:metrics:collect",
      identities: [],
    });
    envelope.payload.canonicalClientName = "client";

    await metricPipeline.accept(envelope);
    expect(writer.snapshot().length).toBeGreaterThan(0);

    const replay = await replayService.replayConnection(connectionId);
    expect(replay.replayed).toBe(1);
    expect(replay.writerResults[0]?.accepted).toBe(true);
  });

  it("envelope metrics-timeseries passa isMetricsTimeseriesEnvelope", async () => {
    const provider = createFakeMetricsProvider({ pluginKey: "example", platformLabel: "example" });
    const envelope = await provider.collect({
      connectionId: asConnectionId("00000000-0000-4000-8000-000000000099"),
      capability: "example:metrics:collect",
      identities: [],
    });
    expect(isMetricsTimeseriesEnvelope(envelope)).toBe(true);
  });
});
