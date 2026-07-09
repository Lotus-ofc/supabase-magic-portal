export type WriterMode = "memory" | "supabase" | "both";

const TRUE_VALUES = new Set(["true", "1", "yes", "on"]);

/**
 * Feature flag — SupabaseWriter desligado por padrão.
 * Habilitar apenas em ambiente validado: PLATFORM_HUB_SUPABASE_WRITER=true
 */
export function isSupabaseWriterEnabled(override?: boolean): boolean {
  if (override !== undefined) return override;
  const raw = process.env.PLATFORM_HUB_SUPABASE_WRITER?.trim().toLowerCase();
  return raw !== undefined && TRUE_VALUES.has(raw);
}

export function resolveWriterMode(mode?: WriterMode, override?: WriterMode): WriterMode {
  return override ?? mode ?? "memory";
}
