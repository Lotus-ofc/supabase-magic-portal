import { parseMarkdownFile } from "./parse";
import { buildNavigationTree } from "./navigation";
import { createSearchIndex } from "./search";
import { extractDocsRelativePath } from "./slug";
import type { DocEntry, NavNode } from "./types";
import type Fuse from "fuse.js";
import type { SearchableDoc } from "./search";

const rawModules = import.meta.glob("../../../docs/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function buildRegistry(): {
  docs: DocEntry[];
  bySlug: Map<string, DocEntry>;
  navTree: NavNode[];
  fuse: Fuse<SearchableDoc>;
  knownSlugs: Set<string>;
} {
  const docs: DocEntry[] = [];

  for (const [globKey, raw] of Object.entries(rawModules)) {
    const relativePath = extractDocsRelativePath(globKey);
    docs.push(parseMarkdownFile(relativePath, raw));
  }

  docs.sort((a, b) => a.path.localeCompare(b.path));

  const bySlug = new Map(docs.map((d) => [d.slug, d]));
  const knownSlugs = new Set(docs.map((d) => d.slug));
  const navTree = buildNavigationTree(docs);
  const fuse = createSearchIndex(docs);

  return { docs, bySlug, navTree, fuse, knownSlugs };
}

const registry = buildRegistry();

export function getAllDocs(): DocEntry[] {
  return registry.docs;
}

export function getDocBySlug(slug: string): DocEntry | undefined {
  return registry.bySlug.get(slug.replace(/^\/+/, "").replace(/\/+$/, ""));
}

export function getNavigationTree(): NavNode[] {
  return registry.navTree;
}

export function getSearchIndex(): Fuse<SearchableDoc> {
  return registry.fuse;
}

export function getKnownSlugs(): Set<string> {
  return registry.knownSlugs;
}

export function getDocsBySlugs(slugs: string[]): DocEntry[] {
  return slugs.map((s) => registry.bySlug.get(s)).filter((d): d is DocEntry => !!d);
}
