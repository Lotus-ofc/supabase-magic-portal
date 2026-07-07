import type { DocEntry } from "@/lib/knowledge-center/types";
import { ensureRegistry } from "@/lib/knowledge-center/registry";
import type {
  AiWorkspaceSnapshot,
  AiWorkspaceSnapshotCore,
  GitSnapshot,
  SearchableSection,
} from "./types";
import { buildOverview } from "./sources/overview";
import { buildArchitecture } from "./sources/architecture";
import { buildModules } from "./sources/modules";
import { buildFlows } from "./sources/flows";
import { buildDatabase } from "./sources/database";
import { buildAdrs } from "./sources/adrs";
import { buildRoadmap } from "./sources/roadmap";
import { buildChangelog } from "./sources/changelog";
import { buildConventions } from "./sources/conventions";
import { buildStack } from "./sources/stack";
import { buildInsights } from "./sources/insights";
import { computeContextScore } from "./context-score";
import { generateChatContext, chatContextSearchText } from "./chat-context-generator";
import gitSnapshotFallback from "./generated/git-snapshot.json";

let snapshotPromise: Promise<AiWorkspaceSnapshot> | null = null;

function docsMap(docs: DocEntry[]): Map<string, DocEntry> {
  return new Map(docs.map((d) => [d.slug, d]));
}

function buildLimitations(
  docs: Map<string, DocEntry>,
  roadmap: ReturnType<typeof buildRoadmap>,
): string[] {
  const items: string[] = [];
  const audit = docs.get("AUDIT");
  if (audit) {
    const lacunas = audit.body.match(/^\|[^|]+\|[^|]+\|[^|]+\|/gm);
    if (lacunas) {
      for (const row of lacunas.slice(1, 6)) {
        if (row.includes("⚠️") || row.toLowerCase().includes("lacuna")) {
          items.push(row.replace(/\|/g, " ").replace(/\s+/g, " ").trim());
        }
      }
    }
  }
  for (const item of roadmap.inProgress.filter((i) => i.text.includes("🔧")).slice(0, 5)) {
    items.push(item.text);
  }
  return items.slice(0, 10);
}

function buildSearchableSections(
  snapshot: AiWorkspaceSnapshotCore,
  chatContextMarkdown: string,
): SearchableSection[] {
  return [
    {
      id: "overview",
      title: "Visão Geral",
      content: [snapshot.overview.summary, ...snapshot.overview.bullets].join(" "),
    },
    {
      id: "architecture",
      title: "Arquitetura",
      content: [
        snapshot.architecture.summary,
        ...snapshot.architecture.layers.map((l) => `${l.name} ${l.description}`),
      ].join(" "),
    },
    {
      id: "modules",
      title: "Módulos",
      content: snapshot.modules
        .map((m) => `${m.label} ${m.objective} ${m.mainFiles.join(" ")}`)
        .join(" "),
    },
    {
      id: "flows",
      title: "Fluxos",
      content: snapshot.flows.map((f) => `${f.name} ${f.steps.join(" ")}`).join(" "),
    },
    {
      id: "database",
      title: "Banco",
      content: [
        snapshot.database.summaryMarkdown,
        ...snapshot.database.tables.map((t) => t.name),
      ].join(" "),
    },
    {
      id: "adrs",
      title: "ADRs",
      content: snapshot.adrs.map((a) => `${a.title} ${a.status} ${a.summary}`).join(" "),
    },
    {
      id: "roadmap",
      title: "Roadmap",
      content: [
        ...snapshot.roadmap.completed.map((i) => i.text),
        ...snapshot.roadmap.inProgress.map((i) => i.text),
        ...snapshot.roadmap.planned.map((i) => i.text),
      ].join(" "),
    },
    {
      id: "changelog",
      title: "Changelog",
      content: [
        ...snapshot.changelog.unreleased,
        ...snapshot.changelog.recentReleases.flatMap((r) => r.items),
      ].join(" "),
    },
    {
      id: "conventions",
      title: "Convenções",
      content: snapshot.conventions.map((c) => `${c.title} ${c.description}`).join(" "),
    },
    {
      id: "insights",
      title: "AI Insights",
      content: snapshot.insights.map((i) => `${i.title} ${i.description}`).join(" "),
    },
    {
      id: "chat-context",
      title: "AI Chat Context",
      content: chatContextSearchText(chatContextMarkdown),
    },
  ];
}

export async function buildAiWorkspaceSnapshot(): Promise<AiWorkspaceSnapshot> {
  const reg = await ensureRegistry();
  const map = docsMap(reg.docs);
  const gitSnap = gitSnapshotFallback as GitSnapshot;

  const overview = buildOverview(map);
  const architecture = buildArchitecture(map);
  const modules = buildModules();
  const flows = buildFlows(map);
  const database = await buildDatabase(map);
  const adrs = buildAdrs(reg.docs);
  const roadmap = buildRoadmap(map);
  const changelog = buildChangelog(map, gitSnap.commits ?? []);
  const conventions = buildConventions(map);
  const stack = buildStack();
  const insights = buildInsights();
  const limitations = buildLimitations(map, roadmap);

  const partial = {
    generatedAt: new Date().toISOString(),
    overview,
    architecture,
    modules,
    flows,
    database,
    adrs,
    roadmap,
    changelog,
    conventions,
    stack,
    limitations,
    insights,
  };

  const chatContextMarkdown = generateChatContext({ snapshot: partial, docs: map });
  const searchableSections = buildSearchableSections(partial, chatContextMarkdown);
  const contextScore = computeContextScore(partial);

  return { ...partial, chatContextMarkdown, searchableSections, contextScore };
}

export async function ensureAiWorkspaceSnapshot(): Promise<AiWorkspaceSnapshot> {
  if (!snapshotPromise) snapshotPromise = buildAiWorkspaceSnapshot();
  return snapshotPromise;
}

export function invalidateAiWorkspaceSnapshot(): void {
  snapshotPromise = null;
}
