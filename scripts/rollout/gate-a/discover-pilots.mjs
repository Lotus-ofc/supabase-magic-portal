#!/usr/bin/env node
/**
 * Gate A — descoberta de clientes piloto Meta em base_metricas (read-only).
 *
 * Uso:
 *   npm run gate-a:discover
 *   GATE_A_DISCOVER_FROM=2026-07-01 GATE_A_DISCOVER_TO=2026-07-07 npm run gate-a:discover
 */
import { spawnSync } from "node:child_process";

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(npx, ["vitest", "run", "--config", "vitest.gate-a.config.ts"], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: {
    ...process.env,
    GATE_A_DISCOVER: "1",
  },
});

process.exit(result.status ?? 1);
