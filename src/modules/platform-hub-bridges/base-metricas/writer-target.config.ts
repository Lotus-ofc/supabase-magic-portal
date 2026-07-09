export type WriterTarget = "MAKE" | "HUB" | "BOTH";

export const METRICAS_TABLE_MAKE = "base_metricas_make" as const;
export const METRICAS_TABLE_HUB = "base_metricas_hub" as const;

const TRUE_VALUES = new Set(["true", "1", "yes", "on"]);

/**
 * Durante homologação o default é HUB — Platform Hub nunca grava em make.
 * PLATFORM_HUB_WRITER_TARGET=HUB|MAKE|BOTH
 */
export function resolveWriterTarget(override?: WriterTarget): WriterTarget {
  if (override) return override;
  const raw = process.env.PLATFORM_HUB_WRITER_TARGET?.trim().toUpperCase();
  if (raw === "MAKE" || raw === "HUB" || raw === "BOTH") return raw;
  return "HUB";
}

export function isHubWriterEnabled(override?: boolean): boolean {
  if (override !== undefined) return override;
  const raw = process.env.PLATFORM_HUB_SUPABASE_WRITER?.trim().toLowerCase();
  if (raw !== undefined) return TRUE_VALUES.has(raw);
  return true;
}

/** Tabelas físicas permitidas para escrita pelo Platform Hub. */
export function resolveWriterTables(target: WriterTarget): readonly string[] {
  if (target === "HUB") return [METRICAS_TABLE_HUB];
  if (target === "BOTH") return [METRICAS_TABLE_HUB];
  if (target === "MAKE") {
    throw new Error("Platform Hub cannot target MAKE — use Make pipeline for production");
  }
  return [METRICAS_TABLE_HUB];
}

export function assertHubWriterTable(table: string): void {
  if (table === METRICAS_TABLE_MAKE) {
    throw new Error("Platform Hub is forbidden from writing to base_metricas_make");
  }
}
