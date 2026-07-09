import { describe, expect, it } from "vitest";
import { asConnectionId } from "../../../../../contracts/connection/connection-id.v1";
import { METRIC_BATCH_CONTRACT_VERSION } from "../../../../../contracts/ingest/profiles/metrics-timeseries.v1";
import type { MetricsTimeseriesIngestEnvelopeV1 } from "../../../../../contracts/ingest/ingest-envelope.v1";
import { createMetricPipelineStack } from "@/modules/platform-hub/metric-pipeline/create-metric-pipeline-stack";
import {
  InMemoryBaselineMetricasQuery,
  compareAgainstBaseline,
  compareMetrics,
  createBaselineReader,
  fromWriterSnapshot,
} from "../index";
import type { BaselineMetricRowV1 } from "../types";

const MAKE_BASELINE: BaselineMetricRowV1[] = [
  {
    data: "2026-07-01",
    cliente: "acme_corp",
    plataforma: "Meta Ads",
    metrica: "impressions",
    valor: 1000,
    campanha: "Campanha A",
  },
  {
    data: "2026-07-01",
    cliente: "acme_corp",
    plataforma: "Meta Ads",
    metrica: "reach",
    valor: 800,
    campanha: "Campanha A",
  },
  {
    data: "2026-07-01",
    cliente: "acme_corp",
    plataforma: "Meta Ads",
    metrica: "clicks",
    valor: 50,
    campanha: "Campanha A",
  },
  {
    data: "2026-07-01",
    cliente: "acme_corp",
    plataforma: "Meta Ads",
    metrica: "spend",
    valor: 25.5,
    campanha: "Campanha A",
  },
];

function envelopeFromBaseline(rows: BaselineMetricRowV1[]): MetricsTimeseriesIngestEnvelopeV1 {
  return {
    version: "1.0.0",
    connectionId: asConnectionId("00000000-0000-4000-8000-000000000099"),
    pluginKey: "meta_ads",
    providerType: "official_api",
    profile: "metrics-timeseries",
    collectedAt: "2026-07-08T12:00:00.000Z",
    payload: {
      version: METRIC_BATCH_CONTRACT_VERSION,
      connectionId: asConnectionId("00000000-0000-4000-8000-000000000099"),
      platformLabel: "Meta Ads",
      canonicalClientName: "acme_corp",
      window: { from: "2026-07-01", to: "2026-07-01" },
      rows: rows.map((row) => ({
        metricKey: row.metrica,
        value: row.valor,
        date: row.data,
        campaign: row.campanha ?? undefined,
      })),
      source: { pluginKey: "meta_ads", providerType: "official_api" },
    },
  };
}

describe("BaselineReader", () => {
  it("lê filtro por cliente/plataforma/período sem transformar", async () => {
    const reader = createBaselineReader({
      queryPort: new InMemoryBaselineMetricasQuery([
        ...MAKE_BASELINE,
        {
          data: "2026-07-02",
          cliente: "other",
          plataforma: "Meta Ads",
          metrica: "impressions",
          valor: 1,
        },
      ]),
      source: "memory",
    });

    const result = await reader.read({
      cliente: "acme_corp",
      plataforma: "Meta Ads",
      from: "2026-07-01",
      to: "2026-07-01",
    });

    expect(result.source).toBe("memory");
    expect(result.rows).toHaveLength(4);
    expect(result.rows[0]).toEqual(MAKE_BASELINE[0]);
  });

  it("filtra métricas e campanha", async () => {
    const reader = createBaselineReader({
      queryPort: new InMemoryBaselineMetricasQuery(MAKE_BASELINE),
      source: "memory",
    });

    const result = await reader.read({
      cliente: "acme_corp",
      plataforma: "Meta Ads",
      from: "2026-07-01",
      to: "2026-07-01",
      campanha: "Campanha A",
      metricas: ["spend", "clicks"],
    });

    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((r) => r.metrica).sort()).toEqual(["clicks", "spend"]);
  });
});

describe("compareMetrics", () => {
  it("100% coverage quando baseline === produced", () => {
    const report = compareMetrics(MAKE_BASELINE, MAKE_BASELINE);

    expect(report.compatible).toBe(true);
    expect(report.coverage).toBe(1);
    expect(report.matchedMetrics).toBe(4);
    expect(report.missingMetrics).toBe(0);
    expect(report.extraMetrics).toBe(0);
    expect(report.valueDifferences).toHaveLength(0);
    expect(report.summary).toContain("COMPATIBLE");
  });

  it("detecta métricas ausentes", () => {
    const produced = MAKE_BASELINE.filter((row) => row.metrica !== "reach");
    const report = compareMetrics(MAKE_BASELINE, produced);

    expect(report.compatible).toBe(false);
    expect(report.missingMetrics).toBe(1);
    expect(report.missing[0]?.metrica).toBe("reach");
    expect(report.coverage).toBe(0.75);
  });

  it("detecta métricas extras", () => {
    const produced = [
      ...MAKE_BASELINE,
      {
        data: "2026-07-01",
        cliente: "acme_corp",
        plataforma: "Meta Ads",
        metrica: "frequency",
        valor: 1.2,
        campanha: "Campanha A",
      },
    ];
    const report = compareMetrics(MAKE_BASELINE, produced);

    expect(report.extraMetrics).toBe(1);
    expect(report.extra[0]?.metrica).toBe("frequency");
    expect(report.compatible).toBe(false);
  });

  it("detecta diferenças de valor", () => {
    const produced = MAKE_BASELINE.map((row) =>
      row.metrica === "spend" ? { ...row, valor: 30 } : row,
    );
    const report = compareMetrics(MAKE_BASELINE, produced);

    expect(report.matchedMetrics).toBe(3);
    expect(report.valueDifferences).toHaveLength(1);
    expect(report.valueDifferences[0]?.delta).toBeCloseTo(4.5);
    expect(report.compatible).toBe(false);
  });

  it("classifica diferença de alias de métrica", () => {
    const produced = MAKE_BASELINE.map((row) =>
      row.metrica === "clicks" ? { ...row, metrica: "cliques" } : row,
    );
    const report = compareMetrics(MAKE_BASELINE, produced);

    expect(report.normalizationDifferences.some((d) => d.kind === "metric_alias")).toBe(true);
    expect(report.matchedMetrics).toBe(4);
    expect(report.compatible).toBe(false);
  });

  it("classifica diferença de alias de plataforma", () => {
    const produced = MAKE_BASELINE.map((row) => ({ ...row, plataforma: "meta_ads" }));
    const report = compareMetrics(MAKE_BASELINE, produced);

    expect(report.normalizationDifferences.some((d) => d.kind === "platform_alias")).toBe(true);
    expect(report.matchedMetrics).toBe(4);
  });
});

describe("compareAgainstBaseline — critério de sucesso", () => {
  it("baseline Reader + pipeline.writer.snapshot()", async () => {
    const pipeline = createMetricPipelineStack();
    await pipeline.metricPipeline.accept(envelopeFromBaseline(MAKE_BASELINE));

    const baselineReader = createBaselineReader({
      queryPort: new InMemoryBaselineMetricasQuery(MAKE_BASELINE),
      source: "memory",
    });

    const report = await compareAgainstBaseline({
      baselineReader,
      filter: {
        cliente: "acme_corp",
        plataforma: "Meta Ads",
        from: "2026-07-01",
        to: "2026-07-01",
      },
      produced: pipeline.writer.snapshot(),
    });

    expect(report.compatible).toBe(true);
    expect(report.coverage).toBe(1);
    expect(fromWriterSnapshot(pipeline.writer.snapshot())).toHaveLength(4);
  });

  it("relata divergência quando Hub produz menos que Make", async () => {
    const pipeline = createMetricPipelineStack();
    const partial = MAKE_BASELINE.slice(0, 2);
    await pipeline.metricPipeline.accept(envelopeFromBaseline(partial));

    const baselineReader = createBaselineReader({
      queryPort: new InMemoryBaselineMetricasQuery(MAKE_BASELINE),
      source: "memory",
    });

    const report = await compareAgainstBaseline({
      baselineReader,
      filter: {
        cliente: "acme_corp",
        plataforma: "Meta Ads",
        from: "2026-07-01",
        to: "2026-07-01",
      },
      produced: pipeline.writer.snapshot(),
    });

    expect(report.compatible).toBe(false);
    expect(report.missingMetrics).toBe(2);
    expect(report.coverage).toBe(0.5);
    expect(report.summary).toContain("DIVERGENT");
  });
});
