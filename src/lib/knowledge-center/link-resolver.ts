import { filePathToSlug, resolveRelativeDocPath, slugToKnowledgePath } from "./slug";

const EXTERNAL_RE = /^(https?:|mailto:|tel:)/i;

export function resolveMarkdownHref(
  href: string,
  currentDocPath: string,
  knownSlugs: Set<string>,
): string {
  if (!href || href.startsWith("#") || EXTERNAL_RE.test(href)) return href;

  const [pathPart, hash] = href.split("#");
  const hashSuffix = hash ? `#${hash}` : "";

  if (pathPart.startsWith("/admin/knowledge/")) {
    return pathPart + hashSuffix;
  }

  if (pathPart.startsWith("/")) {
    return pathPart + hashSuffix;
  }

  const resolved = resolveRelativeDocPath(currentDocPath, pathPart);
  const slug = filePathToSlug(resolved.endsWith(".md") ? resolved : `${resolved}`);
  const normalized = filePathToSlug(resolved);

  if (knownSlugs.has(normalized)) {
    return slugToKnowledgePath(normalized) + hashSuffix;
  }

  if (knownSlugs.has(slug)) {
    return slugToKnowledgePath(slug) + hashSuffix;
  }

  return href;
}
