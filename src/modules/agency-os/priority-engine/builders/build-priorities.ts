import type { AgencyClientCard } from "../../types";
import type { AgencyProject, AgencyTask } from "../../types/operations";
import { scorePriorityCandidate, sortPriorities } from "../calculators/score-priority";
import {
  clientSignalsToCandidates,
  projectsToCandidates,
  tasksToCandidates,
} from "../strategies/map-sources";
import type { OperationalPriority } from "../types";

export function buildOperationalPriorities(input: {
  tasks: AgencyTask[];
  projects: AgencyProject[];
  clients: AgencyClientCard[];
  now?: Date;
  limit?: number;
}): { today: OperationalPriority[]; all: OperationalPriority[] } {
  const now = input.now ?? new Date();
  const clientMap = new Map(input.clients.map((c) => [c.id, c]));

  const raw = [
    ...tasksToCandidates(input.tasks, clientMap),
    ...projectsToCandidates(input.projects, clientMap),
    ...clientSignalsToCandidates(input.clients, now),
  ];

  const scored = sortPriorities(raw.map((c) => scorePriorityCandidate(c, now)));

  const todayStr = now.toISOString().slice(0, 10);
  const today = scored.filter((p) => {
    if (!p.prazo) return p.scoreFinal >= 70;
    const prazoDate = p.prazo.slice(0, 10);
    return prazoDate <= todayStr || p.diasAtraso > 0 || p.scoreFinal >= 75;
  });

  const limit = input.limit ?? 50;
  return {
    today: today.slice(0, Math.min(limit, 20)),
    all: scored.slice(0, limit),
  };
}
