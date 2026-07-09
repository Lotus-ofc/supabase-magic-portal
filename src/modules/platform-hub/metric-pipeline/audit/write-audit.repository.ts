import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { NormalizedMetricBatchV1, WriteResultV1 } from "../metric-batch.types";

export interface WriteAuditRecordV1 {
  id: string;
  connectionId: ConnectionId;
  writerKey: string;
  rowsWritten: number;
  rowsSkipped: number;
  platformLabel: string;
  canonicalClientName: string;
  rowCount: number;
  writtenAt: string;
}

export interface WriteAuditRepositoryPort {
  record(input: {
    batch: NormalizedMetricBatchV1;
    result: WriteResultV1;
  }): Promise<WriteAuditRecordV1>;
  listByConnection(connectionId: ConnectionId): Promise<readonly WriteAuditRecordV1[]>;
}
