import { InMemoryHubObservability } from "./in-memory-hub-observability";
import { InMemorySyncRunRepository } from "./repositories/in-memory-sync-run.repository";
import { InMemoryIntegrationEventBus } from "@/modules/platform-hub/events/in-memory-integration-event-bus";

export interface CreateObservabilityStackOptions {
  observability?: InMemoryHubObservability;
  syncRunRepository?: InMemorySyncRunRepository;
  eventBus?: InMemoryIntegrationEventBus;
}

/** Factory — observabilidade + event bus in-memory. */
export function createObservabilityStack(options: CreateObservabilityStackOptions = {}) {
  const observability = options.observability ?? new InMemoryHubObservability();
  const syncRunRepository = options.syncRunRepository ?? new InMemorySyncRunRepository();
  const eventBus = options.eventBus ?? new InMemoryIntegrationEventBus();

  return { observability, syncRunRepository, eventBus };
}
