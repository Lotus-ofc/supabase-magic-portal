import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { SyncRuntimePortV1 } from "../../../../contracts/runtime/sync-runtime.v1";
import type { ExecutionResultV1 } from "../types";

/** Contrato congelado — enqueue para scheduler distribuído (futuro). */
export type SyncRuntimePort = SyncRuntimePortV1;

/** Port Fase 6 — execução manual síncrona por ConnectionId. */
export interface SyncRuntimeExecutePort {
  execute(connectionId: ConnectionId): Promise<ExecutionResultV1>;
}
