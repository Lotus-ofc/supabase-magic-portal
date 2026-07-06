import { describe, expect, it } from "vitest";
import {
  assertValidTransition,
  canClientTransitionStatus,
  canTransitionStatus,
} from "./status-machine";

describe("status-machine", () => {
  it("allows valid admin transitions", () => {
    expect(canTransitionStatus("producao", "edicao")).toBe(true);
    expect(canTransitionStatus("edicao", "aguardando_aprovacao")).toBe(true);
    expect(canTransitionStatus("aprovado", "publicado")).toBe(true);
  });

  it("blocks invalid transitions", () => {
    expect(canTransitionStatus("publicado", "producao")).toBe(false);
    expect(canTransitionStatus("arquivado", "producao")).toBe(false);
  });

  it("assertValidTransition throws on invalid", () => {
    expect(() => assertValidTransition("publicado", "producao")).toThrow();
  });

  it("allows client approval transitions", () => {
    expect(canClientTransitionStatus("aguardando_aprovacao", "aprovado")).toBe(true);
    expect(canClientTransitionStatus("aguardando_aprovacao", "edicao")).toBe(true);
    expect(canClientTransitionStatus("producao", "aprovado")).toBe(false);
  });
});
