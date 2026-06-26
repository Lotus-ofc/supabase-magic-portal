import Fuse from "fuse.js";
import type { DocEntry, SearchHit } from "./types";

export interface SearchableDoc {
  slug: string;
  title: string;
  description: string;
  path: string;
  tags: string[];
  body: string;
  searchText: string;
}

function toSearchable(doc: DocEntry): SearchableDoc {
  return {
    slug: doc.slug,
    title: doc.title,
    description: doc.description,
    path: doc.path,
    tags: doc.frontmatter.tags ?? [],
    body: doc.body,
    searchText: doc.searchText,
  };
}

export function createSearchIndex(docs: DocEntry[]): Fuse<SearchableDoc> {
  return new Fuse(docs.map(toSearchable), {
    includeScore: true,
    threshold: 0.38,
    ignoreLocation: true,
    keys: [
      { name: "title", weight: 0.45 },
      { name: "description", weight: 0.2 },
      { name: "tags", weight: 0.15 },
      { name: "path", weight: 0.1 },
      { name: "searchText", weight: 0.1 },
    ],
  });
}

export function searchDocs(fuse: Fuse<SearchableDoc>, query: string, limit = 20): SearchHit[] {
  const q = query.trim();
  if (!q) return [];

  return fuse.search(q, { limit }).map((r) => ({
    slug: r.item.slug,
    title: r.item.title,
    description: r.item.description,
    path: r.item.path,
    tags: r.item.tags,
  }));
}
