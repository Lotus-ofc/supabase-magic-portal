import { describe, expect, it } from "vitest";
import { eventTypeForTransition } from "./event-type-for-transition";

describe("eventTypeForTransition", () => {
  it("maps approval flow events", () => {
    expect(eventTypeForTransition("edicao", "aguardando_aprovacao")).toBe("approval_requested");
    expect(eventTypeForTransition("aguardando_aprovacao", "aprovado")).toBe("approved");
    expect(eventTypeForTransition("aguardando_aprovacao", "edicao")).toBe("rejected");
    expect(eventTypeForTransition("aprovado", "publicado")).toBe("published");
    expect(eventTypeForTransition("publicado", "arquivado")).toBe("archived");
    expect(eventTypeForTransition("producao", "edicao")).toBe("moved");
  });
});
