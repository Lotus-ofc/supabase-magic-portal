import type { BaselineMetricRowV1, BaselineReadFilterV1, BaselineReadResultV1 } from "../types";

/** Port de leitura — sem escrita, sem transformações de negócio. */
export interface BaselineReaderPort {
  read(filter: BaselineReadFilterV1): Promise<BaselineReadResultV1>;
}

/** Port interno — query a base_metricas (ou fixture). */
export interface BaselineMetricasQueryPort {
  query(filter: BaselineReadFilterV1): Promise<readonly BaselineMetricRowV1[]>;
}
