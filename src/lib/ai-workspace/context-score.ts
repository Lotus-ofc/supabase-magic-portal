import type { AiWorkspaceSnapshot, ContextScoreBreakdown } from "./types";

type PartialSnapshot = Omit<AiWorkspaceSnapshot, "searchableSections" | "contextScore">;

const CRITERIA: Array<{
  id: string;
  label: string;
  weight: number;
  check: (s: PartialSnapshot) => boolean;
}> = [
  {
    id: "architecture",
    label: "Arquitetura",
    weight: 12.5,
    check: (s) => s.architecture.summary.length > 100 && s.architecture.layers.length >= 5,
  },
  {
    id: "adrs",
    label: "ADRs",
    weight: 12.5,
    check: (s) => s.adrs.length >= 8,
  },
  {
    id: "roadmap",
    label: "Roadmap",
    weight: 12.5,
    check: (s) =>
      s.roadmap.completed.length + s.roadmap.inProgress.length + s.roadmap.planned.length >= 5,
  },
  {
    id: "changelog",
    label: "Changelog",
    weight: 12.5,
    check: (s) => s.changelog.unreleased.length > 0 || s.changelog.recentReleases.length > 0,
  },
  {
    id: "database",
    label: "Banco",
    weight: 12.5,
    check: (s) => s.database.tables.length >= 10 && s.database.migrationFiles.length >= 5,
  },
  {
    id: "flows",
    label: "Fluxos",
    weight: 12.5,
    check: (s) => s.flows.length >= 2 && s.flows.every((f) => f.steps.length >= 3),
  },
  {
    id: "modules",
    label: "Módulos",
    weight: 12.5,
    check: (s) => s.modules.length >= 5 && s.modules.every((m) => m.mainFiles.length > 0),
  },
  {
    id: "documentation",
    label: "Documentação",
    weight: 12.5,
    check: (s) => s.overview.sourceSlugs.length >= 2 && s.conventions.length >= 5,
  },
];

export function computeContextScore(snapshot: PartialSnapshot): ContextScoreBreakdown {
  const criteria = CRITERIA.map((c) => {
    const met = c.check(snapshot);
    return {
      id: c.id,
      label: c.label,
      weight: c.weight,
      score: met ? c.weight : 0,
      met,
    };
  });

  const total = Math.round(criteria.reduce((sum, c) => sum + c.score, 0));

  return { total, criteria };
}
