import { readFile } from "node:fs/promises";
import path from "node:path";
import type { GateAConfigV1 } from "./types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertDate(value: string, field: string): void {
  if (!DATE_RE.test(value)) {
    throw new Error(`Gate A config: ${field} must be YYYY-MM-DD, got "${value}"`);
  }
}

function daysBetweenInclusive(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    throw new Error(`Gate A config: invalid window ${from} → ${to}`);
  }
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function validateGateAConfig(raw: GateAConfigV1): GateAConfigV1 {
  if (!raw.pilot?.canonicalClientName?.trim()) {
    throw new Error("Gate A config: pilot.canonicalClientName is required");
  }
  if (!raw.pilot.cadastroId || raw.pilot.cadastroId < 1) {
    throw new Error("Gate A config: pilot.cadastroId must be a positive integer");
  }
  if (!raw.meta?.adAccountId?.trim()) {
    throw new Error("Gate A config: meta.adAccountId is required");
  }

  assertDate(raw.window.from, "window.from");
  assertDate(raw.window.to, "window.to");

  const windowDays = daysBetweenInclusive(raw.window.from, raw.window.to);
  if (windowDays < 7) {
    throw new Error(
      `Gate A config: window must cover at least 7 days (got ${windowDays}). Adjust from/to.`,
    );
  }

  const mode = raw.mode ?? "live";
  if (mode !== "demo" && mode !== "live") {
    throw new Error(`Gate A config: mode must be "demo" or "live", got "${mode}"`);
  }

  return {
    ...raw,
    pilot: {
      ...raw.pilot,
      canonicalClientName: raw.pilot.canonicalClientName.trim(),
      scopeRef: raw.pilot.scopeRef ?? `cadastro:${raw.pilot.cadastroId}`,
    },
    comparison: {
      minCoverage: raw.comparison?.minCoverage ?? 0.99,
      tolerance: raw.comparison?.tolerance ?? 0.0001,
    },
    outputDir: raw.outputDir ?? "scripts/generated/gate-a-reports",
    mode,
  };
}

export async function loadGateAConfig(configPath: string): Promise<GateAConfigV1> {
  const absolute = path.isAbsolute(configPath)
    ? configPath
    : path.resolve(process.cwd(), configPath);
  const text = await readFile(absolute, "utf8");
  const parsed = JSON.parse(text) as GateAConfigV1;
  return applyGateAEnvOverrides(validateGateAConfig(parsed));
}

export function applyGateAEnvOverrides(config: GateAConfigV1): GateAConfigV1 {
  const token =
    process.env.GATE_A_META_ACCESS_TOKEN?.trim() ||
    process.env.META_ACCESS_TOKEN?.trim() ||
    config.meta.accessToken;

  const mode =
    process.env.GATE_A_MODE === "demo"
      ? "demo"
      : process.env.GATE_A_MODE === "live"
        ? "live"
        : config.mode;

  return {
    ...config,
    mode,
    meta: {
      ...config.meta,
      accessToken: token,
    },
  };
}
