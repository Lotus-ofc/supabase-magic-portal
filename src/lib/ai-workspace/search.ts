import Fuse from "fuse.js";
import type { AiWorkspaceSectionId, SearchableSection } from "./types";

export interface AiWorkspaceSearchHit {
  sectionId: AiWorkspaceSectionId;
  title: string;
  excerpt: string;
  score: number;
}

export function createAiWorkspaceSearchIndex(
  sections: SearchableSection[],
): Fuse<SearchableSection> {
  return new Fuse(sections, {
    includeScore: true,
    threshold: 0.4,
    ignoreLocation: true,
    keys: [
      { name: "title", weight: 0.5 },
      { name: "content", weight: 0.5 },
    ],
  });
}

export function searchAiWorkspace(
  fuse: Fuse<SearchableSection>,
  query: string,
  limit = 10,
): AiWorkspaceSearchHit[] {
  const q = query.trim();
  if (!q) return [];

  return fuse.search(q, { limit }).map((r) => ({
    sectionId: r.item.id,
    title: r.item.title,
    excerpt: extractExcerpt(r.item.content, q),
    score: r.score ?? 0,
  }));
}

function extractExcerpt(content: string, query: string, radius = 80): string {
  const lower = content.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return content.slice(0, radius * 2) + "…";
  const start = Math.max(0, idx - radius);
  const end = Math.min(content.length, idx + query.length + radius);
  return (start > 0 ? "…" : "") + content.slice(start, end) + (end < content.length ? "…" : "");
}
