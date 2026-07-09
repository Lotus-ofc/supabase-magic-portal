import type { IntegrationEventV1 } from "../../../../contracts/events/integration-events.v1";

export type { IntegrationEventV1 };
export {
  INTEGRATION_EVENT_TYPES,
  INTEGRATION_EVENTS_CONTRACT_VERSION,
} from "../../../../contracts/events/integration-events.v1";

/** Namespace integration.* — separado do catálogo CRM do Core EventBus. */
export const PLATFORM_HUB_EVENT_NAMESPACE = "integration" as const;
