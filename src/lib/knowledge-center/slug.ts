const KNOWLEDGE_BASE = "/admin/knowledge";

/** `docs/START_HERE.md` → `start-here`; `docs/02-architecture/overview.md` → `02-architecture/overview` */
export function filePathToSlug(relativeFromDocs: string): string {
  const slug = relativeFromDocs.replace(/\.md$/i, "").replace(/\\/g, "/");
  if (slug.toUpperCase() === "START_HERE") return "start-here";
  return slug;
}

export function slugToKnowledgePath(slug: string): string {
  const normalized = slug.replace(/^\/+/, "").replace(/\/+$/, "");
  return normalized ? `${KNOWLEDGE_BASE}/${normalized}` : KNOWLEDGE_BASE;
}

export function extractDocsRelativePath(globKey: string): string {
  const normalized = globKey.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/docs/");
  if (idx === -1) {
    const alt = normalized.match(/docs\/(.+)$/);
    if (!alt) throw new Error(`Invalid docs path: ${globKey}`);
    return alt[1];
  }
  return normalized.slice(idx + "/docs/".length);
}

/** Resolve a relative markdown href against the current doc path (without .md). */
export function resolveRelativeDocPath(currentDocPath: string, href: string): string {
  const clean = href.replace(/\.md$/i, "").replace(/#.*$/, "");
  const currentDir = currentDocPath.includes("/")
    ? currentDocPath.slice(0, currentDocPath.lastIndexOf("/"))
    : "";

  if (clean.startsWith("/")) return clean.replace(/^\/+/, "");

  const baseParts = currentDir ? currentDir.split("/") : [];
  const hrefParts = clean.split("/");

  for (const part of hrefParts) {
    if (part === "." || part === "") continue;
    if (part === "..") baseParts.pop();
    else baseParts.push(part);
  }

  return baseParts.join("/");
}
