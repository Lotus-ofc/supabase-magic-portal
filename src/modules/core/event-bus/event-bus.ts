import type { DomainEvent, DomainEventHandler, DomainEventType } from "../types/domain-events";

type HandlerEntry = { handler: DomainEventHandler; module?: string };

/**
 * Barramento de eventos in-process, tipado e preparado para workers futuros.
 * Handlers assíncronos são fire-and-forget com catch silencioso em dev.
 */
export class EventBus {
  private handlers = new Map<DomainEventType, HandlerEntry[]>();
  private wildcardHandlers: HandlerEntry[] = [];

  on<TPayload = Record<string, unknown>>(
    type: DomainEventType,
    handler: DomainEventHandler<TPayload>,
    module?: string,
  ): () => void {
    const entry: HandlerEntry = { handler: handler as DomainEventHandler, module };
    const list = this.handlers.get(type) ?? [];
    list.push(entry);
    this.handlers.set(type, list);
    return () => {
      const idx = list.indexOf(entry);
      if (idx >= 0) list.splice(idx, 1);
    };
  }

  onAny(handler: DomainEventHandler, module?: string): () => void {
    const entry: HandlerEntry = { handler, module };
    this.wildcardHandlers.push(entry);
    return () => {
      const idx = this.wildcardHandlers.indexOf(entry);
      if (idx >= 0) this.wildcardHandlers.splice(idx, 1);
    };
  }

  async emit(event: DomainEvent): Promise<void> {
    const typed = this.handlers.get(event.type) ?? [];
    const all = [...typed, ...this.wildcardHandlers];
    await Promise.all(
      all.map(async ({ handler }) => {
        try {
          await handler(event);
        } catch (e) {
          console.error(`[EventBus] handler error for ${event.type}:`, e);
        }
      }),
    );
  }

  /** Serializa evento para fila/worker futuro. */
  serialize(event: DomainEvent): string {
    return JSON.stringify(event);
  }

  deserialize(raw: string): DomainEvent {
    return JSON.parse(raw) as DomainEvent;
  }
}

export const eventBus = new EventBus();
