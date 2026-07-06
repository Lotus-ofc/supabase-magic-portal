import type { DocEntry } from "@/lib/knowledge-center/types";
import type { ConventionRule } from "../types";
import { extractBulletList, extractSection } from "../extractors/markdown-sections";

const rulesGlob = import.meta.glob("../../../../.cursor/rules/*.mdc", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const BOUNDARY_RULES: ConventionRule[] = [
  {
    id: "repo-pattern",
    title: "Repository Pattern",
    description:
      "Supabase access only in *.repository.server.ts — never in routes, services, or workflow.",
    source: "validate-approval-boundaries.mjs",
  },
  {
    id: "server-functions",
    title: "Server Functions",
    description: "createServerFn + requireSupabaseAuth + Zod inputValidator on all server APIs.",
    source: "docs/03-backend/overview.md",
  },
  {
    id: "modules",
    title: "Modules",
    description: "Domain code in src/modules/{domain}/ — register new modules in os-bootstrap.ts.",
    source: "docs/02-architecture/os-core.md",
  },
  {
    id: "boundary-validators",
    title: "Boundary Validators",
    description: "Zod schemas in validators/ — consumed by server functions and command bus.",
    source: "scripts/validate-*-boundaries.mjs",
  },
  {
    id: "auth-access-split",
    title: "Auth / Access Separation",
    description:
      "Auth = session only. Access = authorization lifecycle. Never co-import outside modules.",
    source: "validate-auth-boundaries.mjs",
  },
  {
    id: "event-sourcing",
    title: "Event Sourcing (Content Workflow)",
    description: "content_card_events = immutable timeline. Card is aggregate root.",
    source: "ADR-0018",
  },
  {
    id: "no-direct-supabase",
    title: "Never access Supabase outside Repository",
    description: "Routes and services must not import @/integrations/supabase directly.",
    source: "validate-approval-boundaries.mjs",
  },
];

export function buildConventions(docs: Map<string, DocEntry>): ConventionRule[] {
  const rules: ConventionRule[] = [...BOUNDARY_RULES];

  const codeOrg = docs.get("09-standards/code-organization");
  if (codeOrg) {
    const whereSection = extractSection(codeOrg.body, "Onde colocar código novo");
    for (const item of extractBulletList(whereSection, 8)) {
      rules.push({
        id: `code-org-${rules.length}`,
        title: "Organização de código",
        description: item,
        source: "09-standards/code-organization",
      });
    }
  }

  const governance = docs.get("09-standards/governance");
  if (governance) {
    for (const item of extractBulletList(governance.body, 5)) {
      rules.push({
        id: `gov-${rules.length}`,
        title: "Governança",
        description: item,
        source: "09-standards/governance",
      });
    }
  }

  for (const [path, raw] of Object.entries(rulesGlob)) {
    const name = path.split("/").pop()?.replace(".mdc", "") ?? path;
    const firstLine = raw
      .split("\n")
      .find((l) => l.trim() && !l.startsWith("---"))
      ?.trim();
    if (firstLine) {
      rules.push({
        id: `cursor-${name}`,
        title: `Cursor Rule: ${name}`,
        description: firstLine.slice(0, 200),
        source: `.cursor/rules/${name}.mdc`,
      });
    }
  }

  return rules;
}
