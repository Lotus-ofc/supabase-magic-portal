import { describe, expect, it } from "vitest";
import { scorePriorityCandidate } from "../calculators/score-priority";
import type { RawPriorityCandidate } from "../types";

const baseCandidate: RawPriorityCandidate = {
  type: "task",
  sourceId: "task-1",
  clienteId: 1,
  clienteNome: "Cliente Test",
  origem: "agency_tasks",
  titulo: "Revisar landing",
  descricao: null,
  responsavelUserId: null,
  responsavelLabel: null,
  prazo: new Date().toISOString().slice(0, 10),
  status: "open",
  healthTier: "good",
  healthScore: 70,
  clientPriority: "B",
  clientMrr: 3000,
  valorRelacionado: null,
  updatedAt: null,
  primaryAction: { id: "complete", label: "Concluir" },
};

describe("scorePriorityCandidate", () => {
  it("scores higher for overdue high-mrr clients", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);
    const overdue = scorePriorityCandidate({
      ...baseCandidate,
      prazo: yesterday.toISOString().slice(0, 10),
      clientMrr: 10000,
      healthTier: "critical",
      healthScore: 30,
    });
    const normal = scorePriorityCandidate(baseCandidate);
    expect(overdue.scoreFinal).toBeGreaterThan(normal.scoreFinal);
  });

  it("returns stable id from type and source", () => {
    const scored = scorePriorityCandidate(baseCandidate);
    expect(scored.id).toBe("task:task-1");
  });
});
