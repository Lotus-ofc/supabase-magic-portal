import { spawnSync } from "node:child_process";
import path from "node:path";

const cwd = process.cwd();
const scriptsDir = path.join(cwd, "scripts/architecture-validation");

const steps = [
  ["contract-compat.mjs", "Contract compatibility"],
  ["plugin-conventions.mjs", "Plugin conventions"],
  ["hub-boundaries.mjs", "Hub boundaries"],
];

let failed = false;

for (const [script, label] of steps) {
  const result = spawnSync(process.execPath, [path.join(scriptsDir, script)], {
    cwd,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    failed = true;
    console.error(`❌ ${label} falhou`);
  }
}

if (failed) process.exit(1);
console.log("✅ Architecture validation — OK");
