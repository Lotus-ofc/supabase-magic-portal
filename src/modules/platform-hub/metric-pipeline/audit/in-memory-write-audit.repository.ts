import { randomUUID } from "node:crypto";
import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { WriteAuditRecordV1, WriteAuditRepositoryPort } from "./write-audit.repository";

export class InMemoryWriteAuditRepository implements WriteAuditRepositoryPort {
  private readonly records: WriteAuditRecordV1[] = [];

  async record(
    input: Parameters<WriteAuditRepositoryPort["record"]>[0],
  ): Promise<WriteAuditRecordV1> {
    const entry: WriteAuditRecordV1 = {
      id: randomUUID(),
      connectionId: input.batch.connectionId,
      writerKey: input.result.writerKey,
      rowsWritten: input.result.rowsWritten,
      rowsSkipped: input.result.rowsSkipped,
      platformLabel: input.batch.platformLabel,
      canonicalClientName: input.batch.canonicalClientName,
      rowCount: input.batch.rows.length,
      writtenAt: new Date().toISOString(),
    };
    this.records.push(entry);
    return { ...entry };
  }

  async listByConnection(connectionId: ConnectionId): Promise<readonly WriteAuditRecordV1[]> {
    return this.records
      .filter((record) => record.connectionId === connectionId)
      .map((record) => ({ ...record }));
  }
}
