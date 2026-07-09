import type { IntegrationEventV1 } from "../../../../contracts/events/integration-events.v1";
import type { IntegrationEventEmitterPort } from "./integration-event-emitter.port";

type IntegrationEventHandler = (event: IntegrationEventV1) => void | Promise<void>;

/** Coletor in-memory — simula EventBus sem integrar ao Core. */
export class InMemoryIntegrationEventBus implements IntegrationEventEmitterPort {
  private readonly events: IntegrationEventV1[] = [];
  private readonly handlers = new Map<string, IntegrationEventHandler[]>();

  on(type: IntegrationEventV1["type"], handler: IntegrationEventHandler): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);
  }

  async emit(event: IntegrationEventV1): Promise<void> {
    this.events.push({ ...event });
    const handlers = this.handlers.get(event.type) ?? [];
    for (const handler of handlers) {
      await handler(event);
    }
  }

  snapshot(): readonly IntegrationEventV1[] {
    return this.events.map((event) => ({ ...event }));
  }
}
