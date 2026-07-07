/** Categorias de insights — extensível para scanners v2+. */
export type AiInsightCategory =
  | "todo"
  | "complexity"
  | "architecture"
  | "boundary"
  | "debt"
  | "circular_deps"
  | "dead_code"
  | "repository_health"
  | "performance";

export type AiInsightStatus = "planned" | "active" | "disabled";

/** Contrato para scanners futuros — v1 retorna apenas placeholders. */
export interface AiInsightContract {
  id: string;
  category: AiInsightCategory;
  title: string;
  description: string;
  status: AiInsightStatus;
}

export interface FlowDefinition {
  id: string;
  name: string;
  steps: string[];
  sourceSlug: string;
}

export interface ModuleInfo {
  id: string;
  label: string;
  objective: string;
  responsibilities: string[];
  mainFiles: string[];
  dependencies: string[];
}

export interface AdrSummary {
  id: string;
  title: string;
  status: string;
  date: string;
  summary: string;
  slug: string;
}

export interface RoadmapItem {
  text: string;
  marker?: string;
}

export interface RoadmapSnapshot {
  completed: RoadmapItem[];
  inProgress: RoadmapItem[];
  planned: RoadmapItem[];
}

export interface ChangelogRelease {
  version: string;
  date?: string;
  items: string[];
}

export interface ChangelogSnapshot {
  unreleased: string[];
  recentReleases: ChangelogRelease[];
  recentCommits: GitCommit[];
}

export interface GitCommit {
  hash: string;
  date: string;
  subject: string;
}

export interface GitSnapshot {
  generatedAt: string;
  commits: GitCommit[];
  migrationCount: number;
  moduleCount: number;
}

export interface DatabaseTable {
  name: string;
  migration: string;
  foreignKeys: string[];
}

export interface DatabaseSnapshot {
  tables: DatabaseTable[];
  migrationFiles: string[];
  summaryMarkdown: string;
}

export interface ConventionRule {
  id: string;
  title: string;
  description: string;
  source: string;
}

export interface StackSnapshot {
  framework: string[];
  runtime: string;
  keyDependencies: Record<string, string>;
  scripts: string[];
}

export interface OverviewSnapshot {
  title: string;
  summary: string;
  bullets: string[];
  sourceSlugs: string[];
}

export interface ArchitectureSnapshot {
  summary: string;
  layers: Array<{ name: string; description: string }>;
  sourceSlugs: string[];
}

export interface ContextScoreBreakdown {
  total: number;
  criteria: Array<{ id: string; label: string; weight: number; score: number; met: boolean }>;
}

export type AiWorkspaceSectionId =
  | "overview"
  | "architecture"
  | "modules"
  | "flows"
  | "database"
  | "adrs"
  | "roadmap"
  | "changelog"
  | "conventions"
  | "insights"
  | "chat-context";

export interface SearchableSection {
  id: AiWorkspaceSectionId;
  title: string;
  content: string;
}

export interface AiWorkspaceSnapshot {
  generatedAt: string;
  overview: OverviewSnapshot;
  architecture: ArchitectureSnapshot;
  modules: ModuleInfo[];
  flows: FlowDefinition[];
  database: DatabaseSnapshot;
  adrs: AdrSummary[];
  roadmap: RoadmapSnapshot;
  changelog: ChangelogSnapshot;
  conventions: ConventionRule[];
  stack: StackSnapshot;
  limitations: string[];
  insights: AiInsightContract[];
  contextScore: ContextScoreBreakdown;
  /** Markdown do AI Chat Context — gerado junto ao snapshot para busca e export. */
  chatContextMarkdown: string;
  searchableSections: SearchableSection[];
}

/** Snapshot antes de chat context, score e busca — usado internamente na agregação. */
export type AiWorkspaceSnapshotCore = Omit<
  AiWorkspaceSnapshot,
  "chatContextMarkdown" | "searchableSections" | "contextScore"
>;
