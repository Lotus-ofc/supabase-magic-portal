#!/usr/bin/env node
/**
 * Lotus — validação do Sistema de Engenharia.
 * Garante que artefatos de governança existem no repositório.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredPaths = [
  "docs/START_HERE.md",
  "docs/AUDIT.md",
  "docs/00-company/engineering-system.md",
  "docs/09-standards/governance.md",
  ".env.example",
  "CONTRIBUTING.md",
  ".github/workflows/ci.yml",
  ".cursor/rules/lotus-engineering.mdc",
  ".cursor/rules/docs-maintenance.mdc",
  ".cursor/rules/lotus-governance.mdc",
];

const errors = [];

for (const rel of requiredPaths) {
  if (!fs.existsSync(path.join(root, rel))) {
    errors.push(`Artefato ausente: ${rel}`);
  }
}

// ADR-0011 deve existir após fundação do sistema de engenharia
const adr11 = "docs/02-architecture/adr/0011-engineering-system-foundation.md";
if (!fs.existsSync(path.join(root, adr11))) {
  errors.push(`ADR ausente: ${adr11}`);
}

if (errors.length > 0) {
  console.error("❌ Validação do Sistema de Engenharia falhou:\n");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log("✅ Sistema de Engenharia Lotus — artefatos OK");
