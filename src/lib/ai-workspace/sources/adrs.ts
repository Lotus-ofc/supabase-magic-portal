import type { DocEntry } from "@/lib/knowledge-center/types";
import type { AdrSummary } from "../types";
import { extractSection, stripMarkdownInline } from "../extractors/markdown-sections";

export function buildAdrs(docs: DocEntry[]): AdrSummary[] {
  return docs
    .filter((d) => d.slug.startsWith("02-architecture/adr/") && !d.slug.endsWith("/README"))
    .filter((d) => !d.slug.endsWith("adr/README"))
    .map((doc) => {
      const idMatch = doc.slug.match(/(\d{4})-/);
      const id = idMatch ? `ADR-${idMatch[1]}` : (doc.slug.split("/").pop() ?? doc.slug);
      const decision = extractSection(doc.body, "Decisão") || extractSection(doc.body, "Decision");
      const summary = stripMarkdownInline(decision || doc.description).slice(0, 300);

      return {
        id,
        title: doc.title.replace(/^ADR-\d+\s*[—-]\s*/i, ""),
        status: String(doc.frontmatter.status ?? "unknown"),
        date: String(doc.frontmatter.date ?? doc.frontmatter.last_review ?? ""),
        summary,
        slug: doc.slug,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}
