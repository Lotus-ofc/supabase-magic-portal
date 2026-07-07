import type { DocEntry } from "@/lib/knowledge-center/types";
import { configRegistry } from "@/modules/core/registry/config-registry";
import "@/modules/os-bootstrap";
import type { AdrSummary, ModuleInfo, RoadmapSnapshot } from "../types";
import {
  extractAllSections,
  extractBulletList,
  extractSection,
  firstParagraphs,
  stripMarkdownInline,
} from "../extractors/markdown-sections";

export interface ChatModuleProfile {
  id: string;
  name: string;
  responsibility: string;
  canDo: string[];
  mustNever: string[];
  dependencies: string[];
  state: string;
  source: string;
}

const MODULE_DOC_SLUGS: Record<string, string> = {
  auth: "03-backend/auth-module-v3",
  access: "03-backend/auth-module-v3",
  admin: "06-dashboards/admin-modules",
  approval: "02-architecture/content-workflow",
  client: "06-dashboards/admin-modules",
  core: "02-architecture/os-core",
  "agency-os": "06-dashboards/admin-modules",
};

function inferState(id: string, roadmap: RoadmapSnapshot): string {
  const all = [
    ...roadmap.completed.map((i) => ({ t: i.text, s: "maduro" })),
    ...roadmap.inProgress.map((i) => ({ t: i.text, s: "em evolução" })),
    ...roadmap.planned.map((i) => ({ t: i.text, s: "planejado" })),
  ];
  const hit = all.find(
    (x) => x.t.toLowerCase().includes(id.replace("-", " ")) || x.t.toLowerCase().includes(id),
  );
  if (hit) return hit.s;
  const keywordHits: Record<string, string> = {
    auth: "maduro",
    access: "maduro",
    approval: "maduro",
    "agency-os": "em evolução",
    core: "em evolução",
    client: "maduro",
    admin: "maduro",
  };
  return keywordHits[id] ?? "estável";
}

function parseAdminModuleSections(docs: Map<string, DocEntry>): Map<string, string> {
  const adminModules = docs.get("06-dashboards/admin-modules");
  const byTitle = new Map<string, string>();
  if (!adminModules) return byTitle;
  for (const sec of extractAllSections(adminModules.body)) {
    byTitle.set(sec.title.toLowerCase(), stripMarkdownInline(firstParagraphs(sec.content, 2)));
  }
  return byTitle;
}

function boundariesForModule(
  id: string,
  conventions: { title: string; description: string }[],
): string[] {
  const rules: string[] = [];
  const idLower = id.toLowerCase();
  for (const c of conventions) {
    const text = `${c.title} ${c.description}`.toLowerCase();
    if (
      text.includes(idLower) ||
      (id === "auth" && text.includes("auth")) ||
      (id === "access" && text.includes("access"))
    ) {
      rules.push(c.description);
    }
  }
  if (id === "auth")
    rules.push("Nunca acessar Postgres ou lifecycle de autorização — isso é Access.");
  if (id === "access") rules.push("Nunca gerenciar sessão de login — isso é Auth.");
  if (id === "approval") rules.push("Nunca importar Supabase fora de repositories.");
  return [...new Set(rules)].slice(0, 5);
}

export function buildChatModuleProfiles(
  modules: ModuleInfo[],
  docs: Map<string, DocEntry>,
  roadmap: RoadmapSnapshot,
  conventions: { title: string; description: string }[],
): ChatModuleProfile[] {
  const adminSections = parseAdminModuleSections(docs);
  const osModules = configRegistry.listModules();

  const profiles: ChatModuleProfile[] = modules.map((m) => {
    const docSlug = MODULE_DOC_SLUGS[m.id];
    const doc = docSlug ? docs.get(docSlug) : undefined;
    const docIntro = doc ? firstParagraphs(doc.body, 2) : "";

    const canDo = [
      ...m.responsibilities,
      ...extractBulletList(doc ? extractSection(doc.body, "Resumo") || doc.body : "", 4),
    ].filter(Boolean);

    const osMod = osModules.find((o) => o.id === m.id || o.id.replace("_", "-") === m.id);
    if (osMod?.label) canDo.unshift(`Registrado no OS Core como "${osMod.label}"`);

    return {
      id: m.id,
      name: m.label,
      responsibility: docIntro || m.objective,
      canDo: [...new Set(canDo)].slice(0, 6),
      mustNever: boundariesForModule(m.id, conventions),
      dependencies: m.dependencies,
      state: inferState(m.id, roadmap),
      source: docSlug ?? `src/modules/${m.id}/`,
    };
  });

  // Product surfaces from admin-modules H2 sections
  for (const [title, summary] of adminSections) {
    if (title.includes("removido") || title.includes("mapa de rotas")) continue;
    const exists = profiles.some((p) => title.includes(p.name.toLowerCase()));
    if (exists) continue;
    profiles.push({
      id: title.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
      name: title.replace(/\(.+\)/, "").trim(),
      responsibility: summary,
      canDo: extractBulletList(summary, 3),
      mustNever: ["Não duplicar lógica de domínio existente em src/modules/"],
      dependencies: [],
      state: inferState(title.split(" ")[0] ?? "", roadmap),
      source: "06-dashboards/admin-modules",
    });
  }

  // AI Workspace as product module
  const aiWs = docs.get("06-dashboards/ai-workspace");
  if (aiWs) {
    profiles.push({
      id: "ai-workspace",
      name: "AI Workspace",
      responsibility: firstParagraphs(aiWs.body, 2),
      canDo: [
        "Gerar Context Pack técnico",
        "Gerar AI Chat Context conversacional",
        "Exportar contexto para IAs",
      ],
      mustNever: [
        "Duplicar documentação do Knowledge Center",
        "Substituir fontes oficiais de docs/",
      ],
      dependencies: ["Knowledge Center registry", "src/lib/ai-workspace/"],
      state: "maduro (v1)",
      source: "06-dashboards/ai-workspace",
    });
  }

  return profiles;
}

export function buildPlatformTimeline(adrs: AdrSummary[], roadmap: RoadmapSnapshot): string[] {
  const events: Array<{ date: string; text: string }> = [];

  for (const adr of adrs) {
    if (adr.date) {
      events.push({
        date: adr.date,
        text: `${adr.id}: ${adr.title} — ${adr.summary.slice(0, 120)}`,
      });
    }
  }

  for (const item of roadmap.completed.slice(0, 15)) {
    const dateMatch = item.text.match(/(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/);
    events.push({
      date: dateMatch?.[1] ?? "2026",
      text: stripMarkdownInline(item.text.replace(/✅/u, "").trim()),
    });
  }

  events.sort((a, b) => a.date.localeCompare(b.date));

  return events.map((e, i) => `${i + 1}. (${e.date}) ${e.text}`);
}
