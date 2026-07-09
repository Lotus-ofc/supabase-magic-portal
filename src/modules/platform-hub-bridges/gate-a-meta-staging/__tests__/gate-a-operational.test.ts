import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { InMemoryBaselineMetricasQuery } from "../../base-metricas-reader";
import type { BaselineMetricRowV1 } from "../../base-metricas-reader/types";
import { executeGateAParity } from "../execute-gate-a-parity";
import type { GateAConfigV1 } from "../types";

const DEMO_BASELINE: BaselineMetricRowV1[] = [
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
  {
    data: "2026-07-02",
    cliente: "acme_corp",
    plataforma: "Meta Ads",
    metrica: "impressions",
    valor: 1100,
    campanha: "Campanha A",
  },
  {
    data: "2026-07-02",
    cliente: "acme_corp",
    plataforma: "Meta Ads",
    metrica: "reach",
    valor: 850,
    campanha: "Campanha A",
  },
  {
    data: "2026-07-02",
    cliente: "acme_corp",
    plataforma: "Meta Ads",
    metrica: "clicks",
    valor: 55,
    campanha: "Campanha A",
  },
  {
    data: "2026-07-02",
    cliente: "acme_corp",
    plataforma: "Meta Ads",
    metrica: "spend",
    valor: 26,
    campanha: "Campanha A",
  },
];

function demoConfig(outputDir: string): GateAConfigV1 {
  return {
    pilot: {
      label: "Demo acme_corp",
      cadastroId: 42,
      canonicalClientName: "acme_corp",
    },
    meta: {
      adAccountId: "act_demo_123",
      accessToken: "demo-token",
    },
    window: { from: "2026-07-01", to: "2026-07-07" },
    comparison: { minCoverage: 0.99, tolerance: 0.0001 },
    outputDir,
    mode: "demo",
  };
}

describe("Gate A operational flow (demo)", () => {
  let tempRoot = "";

  afterEach(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
      tempRoot = "";
    }
  });

  it("executa fluxo completo: connection → runtime → pipeline → comparison → relatório", async () => {
    tempRoot = await mkdtemp(path.join(tmpdir(), "gate-a-demo-"));
    const outputDir = path.join(tempRoot, "reports");
    await mkdir(outputDir, { recursive: true });

    const result = await executeGateAParity({
      config: demoConfig(outputDir),
      baselineQuery: new InMemoryBaselineMetricasQuery(DEMO_BASELINE),
      onLogLine: () => undefined,
    });

    expect(result.connectionId).toBeTruthy();
    expect(result.producedRowCount).toBeGreaterThan(0);
    expect(result.baselineRowCount).toBe(DEMO_BASELINE.length);
    expect(
      result.steps.some((s) => s.step === "02_manual_sync_runtime" && s.status === "completed"),
    ).toBe(true);
    expect(result.steps.some((s) => s.step === "05_comparison" && s.status === "completed")).toBe(
      true,
    );

    const summary = await readFile(result.outputPaths.summaryMarkdown, "utf8");
    expect(summary).toContain("Gate A — Relatório de Paridade Meta");

    const reportJson = JSON.parse(await readFile(result.outputPaths.reportJson, "utf8"));
    expect(reportJson.runId).toBe(result.runId);

    expect(result.blockers.some((b) => b.includes("modo demo"))).toBe(true);
  });

  it("rejeita janela menor que 7 dias", async () => {
    await expect(
      executeGateAParity({
        config: {
          ...demoConfig("."),
          window: { from: "2026-07-01", to: "2026-07-03" },
        },
        baselineQuery: new InMemoryBaselineMetricasQuery(DEMO_BASELINE),
      }),
    ).rejects.toThrow(/at least 7 days/i);
  });
});
