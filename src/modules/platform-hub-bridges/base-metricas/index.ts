export type { BaseMetricasInsertPort } from "./ports/base-metricas-insert.port";
export { SupabaseBaseMetricasInsertAdapter } from "./supabase-base-metricas-insert.adapter";
export {
  SupabaseBaseMetricasWriter,
  createSupabaseBaseMetricasWriter,
  createHomologationHubWriter,
} from "./supabase-base-metricas.writer";
export type { SupabaseBaseMetricasWriterOptions } from "./supabase-base-metricas.writer";
export {
  resolveWriterTarget,
  resolveWriterTables,
  isHubWriterEnabled,
  assertHubWriterTable,
  METRICAS_TABLE_MAKE,
  METRICAS_TABLE_HUB,
} from "./writer-target.config";
export type { WriterTarget } from "./writer-target.config";
