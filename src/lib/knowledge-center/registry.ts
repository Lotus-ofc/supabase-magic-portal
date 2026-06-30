import { queryOptions } from "@tanstack/react-query";
import { parseMarkdownFile } from "./parse";
import { buildNavigationTree } from "./navigation";
import { extractDocsRelativePath } from "./slug";
import type { DocEntry, NavNode } from "./types";
import type Fuse from "fuse.js";
import type { SearchableDoc } from "./search";

const rawModules = import.meta.glob("../../../docs/**/*.md", {
  query: "?raw",
  import: "default",
  eager: false,
}) as Record<string, () => Promise<string>>;

type Registry = {
  docs: DocEntry[];
  bySlug: Map<string, DocEntry>;
  navTree: NavNode[];
  knownSlugs: Set<string>;
};

let registryPromise: Promise<Registry> | null = null;
let fuseInstance: Fuse<SearchableDoc> | null = null;
let fusePromise: Promise<Fuse<SearchableDoc>> | null = null;

async function buildRegistry(): Promise<Registry> {
  const entries = Object.entries(rawModules);
  const loaded = await Promise.all(
    entries.map(async ([globKey, loader]) => {
      const raw = await loader();
      const relativePath = extractDocsRelativePath(globKey);
      return parseMarkdownFile(relativePath, raw);
    }),
  );

  loaded.sort((a, b) => a.path.localeCompare(b.path));
  const bySlug = new Map(loaded.map((d) => [d.slug, d]));
  const knownSlugs = new Set(loaded.map((d) => d.slug));
  const navTree = buildNavigationTree(loaded);

  return { docs: loaded, bySlug, navTree, knownSlugs };
}

export async function ensureRegistry(): Promise<Registry> {
  if (!registryPromise) registryPromise = buildRegistry();
  return registryPromise;
}

function normalizeSlug(slug: string): string {
  return slug.replace(/^\/+/, "").replace(/\/+$/, "");
}

export async function getAllDocs(): Promise<DocEntry[]> {
  const reg = await ensureRegistry();
  return reg.docs;
}

export async function getDocBySlug(slug: string): Promise<DocEntry | undefined> {
  const reg = await ensureRegistry();
  return reg.bySlug.get(normalizeSlug(slug));
}

export async function getNavigationTree(): Promise<NavNode[]> {
  const reg = await ensureRegistry();
  return reg.navTree;
}

export async function getKnownSlugs(): Promise<Set<string>> {
  const reg = await ensureRegistry();
  return reg.knownSlugs;
}

export async function getDocsBySlugs(slugs: string[]): Promise<DocEntry[]> {
  const reg = await ensureRegistry();
  return slugs.map((s) => reg.bySlug.get(s)).filter((d): d is DocEntry => !!d);
}

export async function getSearchIndex(): Promise<Fuse<SearchableDoc>> {
  if (fuseInstance) return fuseInstance;
  if (!fusePromise) {
    fusePromise = (async () => {
      const { createSearchIndex } = await import("./search");
      const reg = await ensureRegistry();
      fuseInstance = createSearchIndex(reg.docs);
      return fuseInstance;
    })();
  }
  return fusePromise;
}

export const kcNavQuery = queryOptions({
  queryKey: ["kc", "nav"],
  queryFn: getNavigationTree,
  staleTime: Infinity,
});

export const kcKnownSlugsQuery = queryOptions({
  queryKey: ["kc", "slugs"],
  queryFn: getKnownSlugs,
  staleTime: Infinity,
});

export function kcDocsBySlugsQuery(slugs: string[]) {
  return queryOptions({
    queryKey: ["kc", "docs", ...slugs],
    queryFn: () => getDocsBySlugs(slugs),
    staleTime: Infinity,
  });
}
