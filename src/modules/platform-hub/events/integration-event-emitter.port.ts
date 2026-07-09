import type { IntegrationEventV1 } from "../../../../contracts/events/integration-events.v1";

/** Ponto de extensão para Core EventBus — não registra handlers nesta fase. */
export interface IntegrationEventEmitterPort {
  emit(event: IntegrationEventV1): Promise<void>;
}

export class NoopIntegrationEventEmitter implements IntegrationEventEmitterPort {
  async emit(_event: IntegrationEventV1): Promise<void> {
    // reservado para wiring com Core EventBus (Fase 7+)
  }
}
