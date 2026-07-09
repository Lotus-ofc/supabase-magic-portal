import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ComparisonReportV1 } from "../../base-metricas-reader";
import type { GateAParityRunResultV1 } from "../types";
import { formatGateASummaryMarkdown } from "./format-summary";

function escapeCsv(value: string | number): string {
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildDiffsCsv(comparison: ComparisonReportV1): string {
  const header = "kind,data,metrica,campanha,baseline,produced,delta,detail";
  const valueRows = comparison.valueDifferences.map((diff) =>
    [
      "value",
      diff.row.data,
      diff.row.metrica,
      diff.row.campanha,
      diff.baseline,
      diff.produced,
      diff.delta,
      "",
    ]
      .map(escapeCsv)
      .join(","),
  );

  const normRows = comparison.normalizationDifferences.map((diff) =>
    ["normalization", "", "", "", "", "", "", diff.detail].map(escapeCsv).join(","),
  );

  const missingRows = comparison.missing.map((row) =>
    ["missing", row.data, row.metrica, row.campanha ?? "", row.valor, "", "", ""]
      .map(escapeCsv)
      .join(","),
  );

  const extraRows = comparison.extra.map((row) =>
    ["extra", row.data, row.metrica, row.campanha ?? "", "", row.valor, "", ""]
      .map(escapeCsv)
      .join(","),
  );

  return [header, ...valueRows, ...normRows, ...missingRows, ...extraRows].join("\n");
}

export async function exportGateAReport(
  result: Omit<GateAParityRunResultV1, "outputPaths">,
): Promise<GateAParityRunResultV1["outputPaths"]> {
  const directory = path.resolve(
    process.cwd(),
    result.config.outputDir ?? "scripts/generated/gate-a-reports",
    result.runId,
  );
  await mkdir(directory, { recursive: true });

  const reportJson = path.join(directory, "parity-report.json");
  const summaryMarkdown = path.join(directory, "parity-summary.md");
  const diffsCsv = path.join(directory, "parity-diffs.csv");
  const structuredLog = path.join(directory, "gate-a-run.jsonl");

  const fullResult: GateAParityRunResultV1 = {
    ...result,
    outputPaths: { directory, reportJson, summaryMarkdown, diffsCsv, structuredLog },
  };

  await writeFile(reportJson, `${JSON.stringify(fullResult, null, 2)}\n`, "utf8");
  await writeFile(summaryMarkdown, formatGateASummaryMarkdown(fullResult), "utf8");
  await writeFile(diffsCsv, `${buildDiffsCsv(result.comparison)}\n`, "utf8");
  await writeFile(
    structuredLog,
    result.steps.map((step) => JSON.stringify(step)).join("\n") + "\n",
    "utf8",
  );

  return fullResult.outputPaths;
}
