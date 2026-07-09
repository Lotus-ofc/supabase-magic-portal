export type { BaseMetricasInsertRowV1 } from "@/modules/platform-hub/metric-pipeline/writers/map-to-base-metricas-rows";

export interface BaseMetricasInsertPort {
  insertRows(
    rows: readonly import("@/modules/platform-hub/metric-pipeline/writers/map-to-base-metricas-rows").BaseMetricasInsertRowV1[],
  ): Promise<{
    inserted: number;
  }>;
}
