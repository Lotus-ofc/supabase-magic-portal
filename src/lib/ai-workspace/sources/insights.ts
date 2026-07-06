import type { AiInsightContract } from "../types";

/** Placeholders v1 — scanners reais plugam aqui em v2+. */
export const PLANNED_INSIGHTS: AiInsightContract[] = [
  {
    id: "todo-scanner",
    category: "todo",
    title: "TODO Scanner",
    description: "Detectar TODO/FIXME/HACK no código e priorizar por módulo.",
    status: "planned",
  },
  {
    id: "technical-debt",
    category: "debt",
    title: "Technical Debt",
    description: "Correlacionar dívidas do roadmap com código e migrations.",
    status: "planned",
  },
  {
    id: "complexity-analyzer",
    category: "complexity",
    title: "Complexity Analyzer",
    description: "Medir complexidade ciclomática e acoplamento entre módulos.",
    status: "planned",
  },
  {
    id: "circular-deps",
    category: "circular_deps",
    title: "Circular Dependencies",
    description: "Identificar imports circulares entre módulos e camadas.",
    status: "planned",
  },
  {
    id: "architecture-health",
    category: "architecture",
    title: "Architecture Health",
    description: "Score de aderência aos padrões Repository, Modules e OS Core.",
    status: "planned",
  },
  {
    id: "boundary-violations",
    category: "boundary",
    title: "Boundary Violations",
    description: "Detectar violações além dos scripts CI — em tempo real.",
    status: "planned",
  },
  {
    id: "dead-code",
    category: "dead_code",
    title: "Dead Code",
    description: "Identificar exports e rotas não referenciados.",
    status: "planned",
  },
  {
    id: "repository-health",
    category: "repository_health",
    title: "Repository Health",
    description: "Auditar repositories — métodos órfãos, queries duplicadas.",
    status: "planned",
  },
  {
    id: "performance-insights",
    category: "performance",
    title: "Performance Insights",
    description: "Bundle size, lazy loading gaps, queries N+1 potenciais.",
    status: "planned",
  },
];

export function buildInsights(): AiInsightContract[] {
  return PLANNED_INSIGHTS;
}

/** Interface para scanners futuros — implementar em v2 */
export interface AiInsightScanner {
  id: string;
  category: AiInsightContract["category"];
  scan(): Promise<AiInsightContract[]>;
}

export async function runInsightScanners(
  _scanners: AiInsightScanner[] = [],
): Promise<AiInsightContract[]> {
  return buildInsights();
}
