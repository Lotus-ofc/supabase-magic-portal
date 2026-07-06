#!/usr/bin/env node
/**
 * Content Workflow v3 — boundary validation (Fase 0).
 * 1. @/integrations/supabase só em *.repository.server.ts dentro do módulo approval
 * 2. Rotas não importam *.repository.server.ts diretamente
 * 3. Módulo approval não importa editorial.functions.ts legado
 * 4. workflow/, permissions/, services/ não importam Supabase
 */
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const approvalRoot = path.join(cwd, "src/modules/approval");
const srcRoot = path.join(cwd, "src");
const errors = [];

const SUPABASE_MARKERS = [
  "@/integrations/supabase",
  "@/integrations/supabase",
  "'@/integrations/supabase",
  '"@/integrations/supabase',
];

const REPO_IMPORT_MARKERS = [".repository.server", "/repositories/"];

const EDITORIAL_LEGACY = "editorial.functions";

const NO_SUPABASE_DIRS = ["workflow", "permissions", "services"];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      walk(full, files);
    } else if (/\.(ts|tsx|mjs)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function rel(file) {
  return path.relative(cwd, file).replace(/\\/g, "/");
}

function hasSupabaseImport(content) {
  return SUPABASE_MARKERS.some((m) => content.includes(m));
}

function isRepositoryServerFile(filePath) {
  return filePath.endsWith(".repository.server.ts");
}

function isModuleServerFile(filePath) {
  return filePath.endsWith(".server.ts") && !isRepositoryServerFile(filePath);
}

function hasDisallowedSupabaseImport(content, filePath) {
  if (!hasSupabaseImport(content)) return false;
  if (isRepositoryServerFile(filePath)) return false;
  if (isModuleServerFile(filePath)) {
    const allowed = [
      "@/integrations/supabase/auth-middleware",
      "integrations/supabase/auth-middleware",
    ];
    const onlyAuthMiddleware = allowed.some((m) => content.includes(m));
    const hasClientOrAdmin =
      content.includes("client.server") ||
      content.includes("client.server.ts") ||
      content.includes('/client"') ||
      content.includes("/client'");
    return !(onlyAuthMiddleware && !hasClientOrAdmin);
  }
  return true;
}

// Rule 1 & 4 — approval module boundaries
for (const file of walk(approvalRoot)) {
  const r = rel(file);
  const content = fs.readFileSync(file, "utf8");
  const parts = r.split("/");
  const subdir = parts[3]; // src/modules/approval/<subdir>

  if (hasDisallowedSupabaseImport(content, file) && !isRepositoryServerFile(file)) {
    errors.push(`${r}: import Supabase fora de *.repository.server.ts`);
  }

  if (NO_SUPABASE_DIRS.includes(subdir) && hasSupabaseImport(content)) {
    errors.push(`${r}: ${subdir}/ não pode importar Supabase`);
  }

  if (content.includes(EDITORIAL_LEGACY)) {
    errors.push(`${r}: import proibido de editorial.functions.ts legado`);
  }
}

// Rule 2 — routes must not import repositories directly
for (const file of walk(path.join(srcRoot, "routes"))) {
  const r = rel(file);
  const content = fs.readFileSync(file, "utf8");
  if (REPO_IMPORT_MARKERS.some((m) => content.includes(m))) {
    errors.push(`${r}: rotas não podem importar repositories diretamente`);
  }
  if (content.includes("@/modules/approval/repositories")) {
    errors.push(`${r}: rotas não podem importar @/modules/approval/repositories`);
  }
}

if (errors.length > 0) {
  console.error("❌ Validação approval boundaries falhou:\n");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log("✅ Content Workflow approval boundaries — OK");
