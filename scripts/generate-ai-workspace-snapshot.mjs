#!/usr/bin/env node
/**
 * Gera snapshot git para AI Workspace.
 * Tolerante a falhas — CI sem git history retorna commits vazios.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const outDir = path.join(root, "src/lib/ai-workspace/generated");
const outFile = path.join(outDir, "git-snapshot.json");

function countGlob(dir, pattern) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return 0;
  return fs.readdirSync(full).filter((f) => f.match(pattern)).length;
}

function countModules() {
  const modulesDir = path.join(root, "src/modules");
  if (!fs.existsSync(modulesDir)) return 0;
  return fs.readdirSync(modulesDir, { withFileTypes: true }).filter((d) => d.isDirectory()).length;
}

function getRecentCommits(limit = 15) {
  try {
    const raw = execSync(`git log -${limit} --format=%H|%aI|%s`, {
      cwd: root,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, date, ...rest] = line.split("|");
        return { hash: hash.slice(0, 7), date, subject: rest.join("|") };
      });
  } catch {
    return [];
  }
}

const snapshot = {
  generatedAt: new Date().toISOString(),
  commits: getRecentCommits(),
  migrationCount: countGlob("supabase/migrations-official", /\.sql$/),
  moduleCount: countModules(),
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(snapshot, null, 2) + "\n");
console.log(
  `✅ AI Workspace git snapshot → ${path.relative(root, outFile)} (${snapshot.commits.length} commits)`,
);
