import { describe, expect, it } from "vitest";
import { parseRoadmapMarkdown } from "./extractors/roadmap-parser";
import { parseChangelogMarkdown } from "./extractors/changelog-parser";
import { parseMigrationSql, mergeMigrationTables } from "./extractors/migration-parser";
import { computeContextScore } from "./context-score";
import { generateContextPrompt } from "./prompt-generator";
import { generateChatContext } from "./chat-context-generator";
import type { AiWorkspaceSnapshot, AiWorkspaceSnapshotCore } from "./types";

describe("roadmap-parser", () => {
  it("classifies completed, in progress and planned items", () => {
    const body = `
## Fase 1
- ✅ Migration 18 concluída
- 🔧 Consolidar onboarding
- ✨ MFA no futuro
### Próximas evoluções
- ✨ OAuth providers
`;
    const result = parseRoadmapMarkdown(body);
    expect(result.completed.length).toBeGreaterThanOrEqual(1);
    expect(result.inProgress.length).toBeGreaterThanOrEqual(1);
    expect(result.planned.length).toBeGreaterThanOrEqual(1);
  });
});

describe("changelog-parser", () => {
  it("extracts unreleased section", () => {
    const body = `
## [Não lançado]
- AI Workspace v1
- Fix auth

## [v1.0.0] - 2026-01-01
- Release inicial
`;
    const result = parseChangelogMarkdown(body);
    expect(result.unreleased).toContain("AI Workspace v1");
    expect(result.recentReleases[0]?.version).toBe("v1.0.0");
  });
});

describe("migration-parser", () => {
  it("parses CREATE TABLE and FKs", () => {
    const sql = `
CREATE TABLE public.content_cards (
  id uuid PRIMARY KEY,
  pillar_id uuid REFERENCES public.editorial_pillars(id)
);
CREATE TABLE public.editorial_pillars (
  id uuid PRIMARY KEY
);
`;
    const tables = parseMigrationSql("18_test.sql", sql);
    expect(tables.map((t) => t.name)).toContain("content_cards");
    expect(tables.find((t) => t.name === "content_cards")?.foreignKeys).toContain(
      "editorial_pillars",
    );
  });

  it("merges tables across migrations", () => {
    const merged = mergeMigrationTables([
      { file: "01.sql", sql: "CREATE TABLE public.users (id uuid PRIMARY KEY);" },
      {
        file: "02.sql",
        sql: "CREATE TABLE public.posts (user_id uuid REFERENCES public.users(id));",
      },
    ]);
    expect(merged.length).toBe(2);
  });
});

describe("context-score", () => {
  it("returns score between 0 and 100", () => {
    const mock = {
      overview: { title: "", summary: "x".repeat(100), bullets: [], sourceSlugs: ["a", "b"] },
      architecture: {
        summary: "x".repeat(200),
        layers: Array(6).fill({ name: "a", description: "b" }),
        sourceSlugs: [],
      },
      modules: [
        {
          id: "a",
          label: "A",
          objective: "",
          responsibilities: [],
          mainFiles: ["f"],
          dependencies: [],
        },
      ],
      flows: [{ id: "f", name: "F", steps: ["a", "b", "c"], sourceSlug: "" }],
      database: {
        tables: Array(12).fill({ name: "t", migration: "m", foreignKeys: [] }),
        migrationFiles: Array(6).fill("m"),
        summaryMarkdown: "",
      },
      adrs: Array(10).fill({
        id: "ADR-1",
        title: "T",
        status: "Aceito",
        date: "",
        summary: "",
        slug: "",
      }),
      roadmap: {
        completed: [{ text: "a" }],
        inProgress: [{ text: "b" }],
        planned: [{ text: "c" }],
      },
      changelog: { unreleased: ["item"], recentReleases: [], recentCommits: [] },
      conventions: Array(6).fill({ id: "c", title: "T", description: "D", source: "s" }),
      stack: { framework: [], runtime: "", keyDependencies: {}, scripts: [] },
      limitations: [],
      insights: [],
      generatedAt: new Date().toISOString(),
    };
    const score = computeContextScore(mock);
    expect(score.total).toBeGreaterThan(50);
    expect(score.total).toBeLessThanOrEqual(100);
  });
});

describe("prompt-generator", () => {
  it("includes all required sections", () => {
    const snapshot = {
      generatedAt: new Date().toISOString(),
      overview: { title: "T", summary: "Resumo", bullets: ["b1"], sourceSlugs: [] },
      architecture: {
        summary: "Arch",
        layers: [{ name: "Frontend", description: "React" }],
        sourceSlugs: [],
      },
      modules: [
        {
          id: "auth",
          label: "Auth",
          objective: "Login",
          responsibilities: [],
          mainFiles: [],
          dependencies: [],
        },
      ],
      flows: [{ id: "f", name: "Flow", steps: ["a", "b"], sourceSlug: "" }],
      database: { tables: [], migrationFiles: [], summaryMarkdown: "DB" },
      adrs: [
        {
          id: "ADR-0001",
          title: "Test",
          status: "Aceito",
          date: "2026",
          summary: "Decisão",
          slug: "",
        },
      ],
      roadmap: { completed: [], inProgress: [{ text: "Em curso" }], planned: [{ text: "Futuro" }] },
      changelog: { unreleased: ["Nova feature"], recentReleases: [], recentCommits: [] },
      conventions: [{ id: "r", title: "Repo Pattern", description: "Desc", source: "ci" }],
      stack: {
        framework: ["TanStack"],
        runtime: "Node 22",
        keyDependencies: { react: "19" },
        scripts: [],
      },
      limitations: ["Lacuna X"],
      insights: [],
      chatContextMarkdown: "",
      contextScore: { total: 80, criteria: [] },
      searchableSections: [],
    } satisfies AiWorkspaceSnapshot;

    const prompt = generateContextPrompt(snapshot);
    expect(prompt).toContain("Resumo Executivo");
    expect(prompt).toContain("Stack Tecnológica");
    expect(prompt).toContain("Arquitetura");
    expect(prompt).toContain("Módulos");
    expect(prompt).toContain("Fluxos Principais");
    expect(prompt).toContain("Domínio do Banco");
    expect(prompt).toContain("ADRs");
    expect(prompt).toContain("Roadmap");
    expect(prompt).toContain("Convenções Obrigatórias");
    expect(prompt).toContain("Limitações Conhecidas");
    expect(prompt).toContain("Objetivo Atual");
    expect(prompt).toContain("Próximos Passos");
  });
});

const mockCoreSnapshot = {
  generatedAt: new Date().toISOString(),
  overview: {
    title: "T",
    summary: "Lots BI é um SaaS de BI para agências de marketing digital com operação integrada.",
    bullets: ["b1"],
    sourceSlugs: ["start-here"],
  },
  architecture: {
    summary: "TanStack Start + Supabase com módulos de domínio isolados e RLS multi-tenant.",
    layers: [{ name: "Frontend", description: "React" }],
    sourceSlugs: [],
  },
  modules: [
    {
      id: "auth",
      label: "Auth",
      objective: "Autenticação de sessão",
      responsibilities: ["Login"],
      mainFiles: ["modules/auth"],
      dependencies: ["Supabase Auth"],
    },
  ],
  flows: [{ id: "f", name: "Flow", steps: ["a", "b", "c"], sourceSlug: "" }],
  database: {
    tables: [{ name: "profiles", migration: "01.sql", foreignKeys: [] }],
    migrationFiles: ["01.sql"],
    summaryMarkdown: "Postgres com RLS",
  },
  adrs: [
    {
      id: "ADR-0001",
      title: "Base",
      status: "Aceito",
      date: "2026-01-01",
      summary: "TanStack + Supabase",
      slug: "",
    },
  ],
  roadmap: {
    completed: [{ text: "Auth v3 concluído" }],
    inProgress: [{ text: "Agency OS em evolução" }],
    planned: [{ text: "Coletores proprietários" }],
  },
  changelog: { unreleased: ["AI Workspace"], recentReleases: [], recentCommits: [] },
  conventions: [
    { id: "r", title: "Repository Pattern", description: "Supabase só em repos", source: "ci" },
  ],
  stack: {
    framework: ["TanStack"],
    runtime: "Node 22",
    keyDependencies: { react: "19" },
    scripts: [],
  },
  limitations: [],
  insights: [],
} satisfies AiWorkspaceSnapshotCore;

describe("chat-context-generator", () => {
  it("includes all 14 mandatory sections", () => {
    const docs = new Map<
      string,
      {
        slug: string;
        path: string;
        frontmatter: object;
        body: string;
        title: string;
        description: string;
        toc: [];
        searchText: string;
      }
    >();
    const chat = generateChatContext({ snapshot: mockCoreSnapshot, docs });
    expect(chat).toContain("## 1. Produto");
    expect(chat).toContain("## 2. Filosofia");
    expect(chat).toContain("## 3. História da plataforma");
    expect(chat).toContain("## 4. Arquitetura geral");
    expect(chat).toContain("## 5. Todos os módulos");
    expect(chat).toContain("## 5b. Platform Hub");
    expect(chat).toContain("## 6. Banco de dados");
    expect(chat).toContain("## 7. Tecnologias");
    expect(chat).toContain("## 8. Funcionalidades prontas");
    expect(chat).toContain("## 9. Funcionalidades planejadas");
    expect(chat).toContain("## 10. Regras de Ouro");
    expect(chat).toContain("## 11. Estado atual do projeto");
    expect(chat).toContain("## 12. Objetivo do momento");
    expect(chat).toContain("## 13. INSTRUÇÕES PARA A IA");
    expect(chat).toContain("## 14. Resumo executivo");
  });
});
