import { queryOptions } from "@tanstack/react-query";
import { parseMarkdownFile } from "@/lib/knowledge-center/parse";
import type { NavNode } from "@/lib/knowledge-center";
import type { TutorialAudience, TutorialDoc, TutorialRegistry } from "./types";

const rawModules = import.meta.glob("../../content/platform-tutorial/**/*.md", {
  query: "?raw",
  import: "default",
  eager: false,
}) as Record<string, () => Promise<string>>;

function extractTutorialPath(globKey: string): string {
  const normalized = globKey.replace(/\\/g, "/");
  const marker = "/content/platform-tutorial/";
  const idx = normalized.lastIndexOf(marker);
  if (idx === -1) throw new Error(`Invalid tutorial path: ${globKey}`);
  return normalized.slice(idx + marker.length);
}

function pathToSlug(relativePath: string): string {
  return relativePath.replace(/\.md$/i, "").replace(/\\/g, "/");
}

function buildFlatNav(docs: TutorialDoc[], audience: TutorialAudience): NavNode[] {
  return docs
    .filter((d) => d.slug.startsWith(`${audience}/`))
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map((d) => ({
      id: `tutorial:${d.slug}`,
      type: "doc" as const,
      label: d.title,
      slug: d.slug,
      order: 0,
    }));
}

let registryPromise: Promise<TutorialRegistry> | null = null;

async function buildRegistry(): Promise<TutorialRegistry> {
  const entries = Object.entries(rawModules);
  const loaded = await Promise.all(
    entries.map(async ([globKey, loader]) => {
      const raw = await loader();
      const relativePath = extractTutorialPath(globKey);
      const parsed = parseMarkdownFile(relativePath, raw);
      return { ...parsed, slug: pathToSlug(relativePath) };
    }),
  );

  loaded.sort((a, b) => a.slug.localeCompare(b.slug));
  const bySlug = new Map(loaded.map((d) => [d.slug, d]));

  return {
    docs: loaded,
    bySlug,
    adminNav: buildFlatNav(loaded, "admin"),
    clientNav: buildFlatNav(loaded, "client"),
  };
}

export async function ensureTutorialRegistry(): Promise<TutorialRegistry> {
  if (!registryPromise) registryPromise = buildRegistry();
  return registryPromise;
}

export async function getTutorialDoc(slug: string): Promise<TutorialDoc | undefined> {
  const reg = await ensureTutorialRegistry();
  return reg.bySlug.get(slug.replace(/^\/+|\/+$/g, ""));
}

export async function getTutorialNav(audience: TutorialAudience): Promise<NavNode[]> {
  const reg = await ensureTutorialRegistry();
  return audience === "admin" ? reg.adminNav : reg.clientNav;
}

export function tutorialNavQuery(audience: TutorialAudience) {
  return queryOptions({
    queryKey: ["platform-tutorial", "nav", audience],
    queryFn: () => getTutorialNav(audience),
    staleTime: Infinity,
  });
}

export function tutorialDocQuery(slug: string) {
  return queryOptions({
    queryKey: ["platform-tutorial", "doc", slug],
    queryFn: async () => {
      const doc = await getTutorialDoc(slug);
      if (!doc) throw new Error("Tutorial não encontrado");
      return doc;
    },
    staleTime: Infinity,
  });
}

export function tutorialBasePath(audience: TutorialAudience): string {
  return audience === "admin" ? "/admin/tutorial" : "/tutorial";
}
