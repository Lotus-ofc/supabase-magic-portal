import type { GateAParityRunResultV1 } from "../types";

export function formatGateASummaryMarkdown(result: GateAParityRunResultV1): string {
  const { config, comparison, coverage, divergences, blockers } = result;
  const status = result.gateAPassed ? "✅ APROVADO" : "❌ DIVERGENTE / BLOQUEADO";

  const coreLines = Object.entries(coverage.coreMetrics)
    .map(
      ([metric, stats]) =>
        `| ${metric} | ${stats.baselineRows} | ${stats.matched} | ${(stats.coverage * 100).toFixed(1)}% |`,
    )
    .join("\n");

  const blockerSection =
    blockers.length === 0
      ? "_Nenhum bloqueador registrado._"
      : blockers.map((b) => `- ${b}`).join("\n");

  const topDiffs =
    divergences.topValueDeltas.length === 0
      ? "_Nenhuma diferença de valor._"
      : divergences.topValueDeltas
          .map(
            (d) =>
              `- **${d.data}** / ${d.metrica} / ${d.campanha || "(sem campanha)"}: baseline=${d.baseline}, hub=${d.produced}, Δ=${d.delta}`,
          )
          .join("\n");

  return `# Gate A — Relatório de Paridade Meta

**Status:** ${status}  
**Run ID:** ${result.runId}  
**Cliente piloto:** ${config.pilot.label} (\`${config.pilot.canonicalClientName}\`)  
**Janela:** ${config.window.from} → ${config.window.to}  
**Modo:** ${config.mode}  
**Gerado em:** ${result.finishedAt}

## Resumo

| Indicador | Valor |
|-----------|-------|
| Coverage geral | ${(comparison.coverage * 100).toFixed(2)}% |
| Linhas baseline (Make) | ${result.baselineRowCount} |
| Linhas produzidas (Hub) | ${result.producedRowCount} |
| Métricas matched | ${comparison.matchedMetrics} |
| Missing | ${comparison.missingMetrics} |
| Extra | ${comparison.extraMetrics} |
| Value diffs | ${divergences.valueDifferences} |
| Normalization diffs | ${divergences.normalizationDifferences} |
| Dias na janela | ${coverage.daysInWindow} |
| Dias com baseline | ${coverage.daysWithBaselineData} |
| Dias com produção Hub | ${coverage.daysWithProducedData} |

## Métricas core

| Métrica | Baseline rows | Matched | Coverage |
|---------|---------------|---------|----------|
${coreLines}

## Comparação

\`\`\`
${comparison.summary}
\`\`\`

## Bloqueadores

${blockerSection}

## Top divergências de valor

${topDiffs}

## Artefatos

- JSON completo: \`${result.outputPaths.reportJson}\`
- CSV de diffs: \`${result.outputPaths.diffsCsv}\`
- Log estruturado: \`${result.outputPaths.structuredLog}\`

---

_Make continua sendo a única origem oficial em produção. Este relatório é somente observação (Gate A)._
`;
}
