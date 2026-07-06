import { describe, expect, it } from "vitest";
import { groupTimelineEvents } from "./group-timeline-events";
import type { AgencyTimelineEvent } from "../types";

function event(partial: Partial<AgencyTimelineEvent> & { event_type: AgencyTimelineEvent["event_type"] }): AgencyTimelineEvent {
  return {
    id: partial.id ?? crypto.randomUUID(),
    cadastro_cliente_id: 1,
    entity_type: "task",
    entity_id: "1",
    title: partial.title ?? "Evento",
    summary: null,
    payload: {},
    actor_email: null,
    created_at: partial.created_at ?? new Date().toISOString(),
    event_type: partial.event_type,
    cliente_nome: "Cliente",
  };
}

describe("groupTimelineEvents", () => {
  it("aggregates repeated event types when count >= 3", () => {
    const now = new Date();
    const events = Array.from({ length: 4 }).map((_, i) =>
      event({
        id: `e-${i}`,
        event_type: "task_completed",
        title: `Tarefa ${i}`,
        created_at: new Date(now.getTime() - i * 60000).toISOString(),
      }),
    );
    const groups = groupTimelineEvents(events, now);
    const today = groups.find((g) => g.period === "Hoje");
    expect(today?.items.some((i) => i.kind === "aggregate" && i.aggregateCount === 4)).toBe(true);
  });
});
