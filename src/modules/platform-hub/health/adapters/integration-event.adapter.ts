/**
 * Adaptador interno — contrato para futura integração EventBus (Fase 6+).
 * Não registra handlers; apenas normaliza eventos de integração.
 */
import { INTEGRATION_EVENTS_CONTRACT_VERSION } from "../../../../../contracts/events/integration-events.v1";
import type { IntegrationEventV1 } from "../../../../../contracts/events/integration-events.v1";
import type { HealthInboundSignalV1 } from "../types";

export function toHealthInboundSignal(event: IntegrationEventV1): HealthInboundSignalV1 {
  if (event.version !== INTEGRATION_EVENTS_CONTRACT_VERSION) {
    throw new Error(`Unsupported integration event version: ${event.version}`);
  }
  return event;
}
