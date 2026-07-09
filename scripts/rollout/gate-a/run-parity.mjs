#!/usr/bin/env node
/**
 * Gate A — execução live de paridade Meta × Make baseline.
 *
 * Uso:
 *   npm run gate-a:parity -- --config=src/modules/platform-hub-bridges/gate-a-meta-staging/fixtures/gate-a.config.example.json
 *
 * Variáveis:
 *   GATE_A_META_ACCESS_TOKEN — token Meta (preferível a commitar no JSON)
 *   OFFICIAL_SUPABASE_URL + OFFICIAL_SERVICE_ROLE_KEY — leitura baseline Make
 */
import { spawnSync } from "node:child_process";

const configArg =
  process.argv
    .find((arg) => arg.startsWith("--config="))
    ?.split("=")
    .slice(1)
    .join("=") ??
  process.argv[2] ??
  process.env.GATE_A_CONFIG;

if (!configArg) {
  console.error("Erro: informe --config=path/to/gate-a.config.json");
  console.error("Exemplo: npm run gate-a:parity -- --config=./meu-piloto.config.json");
  process.exit(1);
}

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(npx, ["vitest", "run", "--config", "vitest.gate-a.config.ts"], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: {
    ...process.env,
    GATE_A_CONFIG: configArg,
    GATE_A_MODE: process.env.GATE_A_MODE ?? "live",
  },
});

process.exit(result.status ?? 1);
