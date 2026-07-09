#!/usr/bin/env node
/**
 * Gera documentação operacional do Platform Hub a partir do registry-report.
 * Fonte única: scripts/generated/registry-report.json
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const reportPath = path.join(root, "scripts/generated/registry-report.json");
const outPath = path.join(root, "docs/06-dashboards/platform-hub-registry-ops.md");

const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const plugins = report.plugins ?? [];

const lines = [
  "# Platform Hub — Documentação operacional (auto)",
  "",
  `> Gerado automaticamente em ${new Date().toISOString()} · contract ${report.contractVersion}`,
  "",
  "## Rotas administrativas",
  "",
  "| Rota | Função |",
  "|------|--------|",
  "| `/admin/conexoes` | Painel operacional |",
  "| `/admin/conexoes/nova` | Assistente de conexão |",
  "| `/admin/conexoes/:id` | Detalhe, credenciais, diagnóstico |",
  "| `/admin/conexoes/health` | Health dashboard |",
  "| `/admin/conexoes/migracao` | Migração Make → Official |",
  "",
  "## Plataformas (Registry)",
  "",
];

for (const plugin of plugins) {
  lines.push(`### ${plugin.key}`);
  lines.push("");
  lines.push(`- **Capabilities:** ${(plugin.capabilities ?? []).join(", ") || "—"}`);
  lines.push(`- **Providers:** ${(plugin.providers ?? []).join(", ") || "—"}`);
  if (plugin.oauth) lines.push(`- **OAuth:** ${plugin.oauth}`);
  if (plugin.identityTypes?.length) {
    lines.push(`- **Identities:** ${plugin.identityTypes.join(", ")}`);
  }
  lines.push("");
  lines.push(
    "**Fluxo operador:** Catálogo → Conectar → OAuth ou credenciais → Selecionar identidades → Sync.",
  );
  lines.push("");
}

lines.push("## Estágios de migração");
lines.push("");
for (const stage of ["make_passive", "parity", "dual_run", "ready", "official_only", "make_off"]) {
  lines.push(`- \`${stage}\``);
}

fs.writeFileSync(outPath, lines.join("\n") + "\n");
console.log(`✅ KC ops doc → ${path.relative(root, outPath)} (${plugins.length} plugins)`);
