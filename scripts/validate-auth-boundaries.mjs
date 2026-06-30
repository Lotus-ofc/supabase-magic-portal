#!/usr/bin/env node
/**
 * Regra de Ouro: nenhuma tela co-importa @/modules/auth e barrel @/modules/access.
 * Exceções: rotas /auth/* (orchestrator permitido) e arquivos dentro de modules/.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "src");
const ALLOWLIST = new Set([
  // Shell autenticado: gate Access + botão signOut (Auth hook isolado)
  "src/routes/_authenticated/route.tsx",
]);

const AUTH_MARKERS = ['from "@/modules/auth"', "from '@/modules/auth'"];
const ACCESS_BARREL = ['from "@/modules/access"', "from '@/modules/access'"];
const ORCHESTRATOR = "post-auth-orchestrator.server";
const errors = [];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      walk(full, files);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

for (const file of walk(root)) {
  const rel = path.relative(process.cwd(), file).replace(/\\/g, "/");
  if (rel.startsWith("src/modules/")) continue;
  if (rel.startsWith("src/routes/auth/")) continue;
  if (rel.startsWith("src/features/auth/")) continue;

  if (ALLOWLIST.has(rel)) continue;

  const content = fs.readFileSync(file, "utf8");
  const hasAuth = AUTH_MARKERS.some((m) => content.includes(m));
  const hasAccessBarrel = ACCESS_BARREL.some((m) => content.includes(m));
  if (hasAuth && hasAccessBarrel) {
    errors.push(`${rel}: co-import proibido de modules/auth + modules/access`);
  }

  if (rel.startsWith("src/routes/auth/")) continue;
  if (hasAuth && content.includes("@/modules/access/") && !content.includes(ORCHESTRATOR)) {
    const accessImports = content.match(/from ["']@\/modules\/access\/[^"']+["']/g) ?? [];
    for (const imp of accessImports) {
      if (!imp.includes(ORCHESTRATOR)) {
        errors.push(`${rel}: import access fora do orchestrator — ${imp}`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error("❌ Validação Regra de Ouro (auth boundaries) falhou:\n");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log("✅ Regra de Ouro auth/access — OK");
