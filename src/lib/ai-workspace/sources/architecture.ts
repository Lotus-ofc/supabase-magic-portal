import type { DocEntry } from "@/lib/knowledge-center/types";
import type { ArchitectureSnapshot } from "../types";
import {
  extractSection,
  firstParagraphs,
  stripMarkdownInline,
} from "../extractors/markdown-sections";

const ARCH_SLUGS = [
  "02-architecture/overview",
  "02-architecture/current-state",
  "02-architecture/data-flow",
];

export function buildArchitecture(docs: Map<string, DocEntry>): ArchitectureSnapshot {
  const overview = docs.get("02-architecture/overview");
  const current = docs.get("02-architecture/current-state");

  const summary = overview
    ? firstParagraphs(extractSection(overview.body, "Resumo executivo") || overview.body, 2)
    : "TanStack Start + Supabase — full-stack TypeScript com server functions e RLS.";

  const layers = [
    {
      name: "Frontend",
      description: extractLayer(
        overview,
        "React 19, TanStack Start/Router/Query, Tailwind, Radix/shadcn",
      ),
    },
    {
      name: "Backend",
      description: extractLayer(
        overview,
        "Server Functions (TanStack Start) + middleware requireSupabaseAuth",
      ),
    },
    {
      name: "Supabase",
      description: extractLayer(overview, "Postgres + Auth + RLS + views SECURITY DEFINER"),
    },
    {
      name: "Modules",
      description:
        "Domínios em src/modules/ — auth, access, admin, approval, agency-os, client, core",
    },
    {
      name: "Repositories",
      description:
        "Supabase access isolado em *.repository.server.ts — nunca em routes ou services",
    },
    {
      name: "Services",
      description: "Lógica pura sem Supabase — workflow, permissions, formulas, intelligence",
    },
    {
      name: "Server Functions",
      description: "createServerFn + Zod validators — entrypoints de API por módulo",
    },
    {
      name: "Workflow",
      description: extractLayer(current, "Route → ServerFn → internal → repository → DB"),
    },
    {
      name: "RLS",
      description: "Isolamento multi-tenant via current_user_clientes() e has_role()",
    },
  ];

  return {
    summary: stripMarkdownInline(summary),
    layers,
    sourceSlugs: ARCH_SLUGS.filter((s) => docs.has(s)),
  };
}

function extractLayer(doc: DocEntry | undefined, fallback: string): string {
  if (!doc) return fallback;
  const stackSection = extractSection(doc.body, "Stack tecnológica (estado atual)");
  if (stackSection)
    return stripMarkdownInline(firstParagraphs(stackSection, 1)).slice(0, 200) || fallback;
  return fallback;
}
