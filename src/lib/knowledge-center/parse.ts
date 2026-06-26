import matter from "gray-matter";
import type { DocEntry, DocFrontmatter, TocItem } from "./types";
import { filePathToSlug } from "./slug";

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/gm;

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function extractToc(body: string): TocItem[] {
  const items: TocItem[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(HEADING_RE.source, HEADING_RE.flags);
  while ((match = re.exec(body)) !== null) {
    const level = match[1].length;
    const text = match[2].replace(/\*\*/g, "").replace(/`/g, "").trim();
    if (level <= 3 && level > 1) {
      items.push({ id: slugifyHeading(text), text, level });
    }
  }
  return items;
}

function firstHeadingTitle(body: string): string | undefined {
  const m = body.match(/^#\s+(.+)$/m);
  return m?.[1]?.replace(/\*\*/g, "").trim();
}

function firstParagraph(body: string): string | undefined {
  const lines = body.split("\n");
  const buf: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#") || t === "---") {
      if (buf.length) break;
      continue;
    }
    if (t.startsWith(">")) {
      buf.push(t.replace(/^>\s*/, ""));
      continue;
    }
    buf.push(t);
    if (buf.join(" ").length > 40) break;
  }
  return buf.join(" ").slice(0, 200) || undefined;
}

function normalizeTags(tags: unknown): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(String);
  if (typeof tags === "string")
    return tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  return [];
}

function normalizeFrontmatter(data: Record<string, unknown>): DocFrontmatter {
  return {
    title: typeof data.title === "string" ? data.title : undefined,
    description: typeof data.description === "string" ? data.description : undefined,
    author: typeof data.author === "string" ? data.author : undefined,
    owner: typeof data.owner === "string" ? data.owner : undefined,
    status: typeof data.status === "string" ? data.status : undefined,
    tags: normalizeTags(data.tags),
    related: Array.isArray(data.related) ? data.related.map(String) : undefined,
    difficulty: typeof data.difficulty === "string" ? data.difficulty : undefined,
    created: typeof data.created === "string" ? data.created : undefined,
    updated: typeof data.updated === "string" ? data.updated : undefined,
    last_review: typeof data.last_review === "string" ? data.last_review : undefined,
  };
}

function stripMarkdownForSearch(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_~-]/g, " ")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseMarkdownFile(relativePath: string, raw: string): DocEntry {
  const { data, content } = matter(raw);
  const frontmatter = normalizeFrontmatter(data as Record<string, unknown>);
  const body = content.trim();
  const path = filePathToSlug(relativePath);
  const slug = path;
  const title = frontmatter.title ?? firstHeadingTitle(body) ?? slug.split("/").pop() ?? slug;
  const description = frontmatter.description ?? firstParagraph(body) ?? "";

  return {
    slug,
    path,
    frontmatter,
    body,
    title,
    description,
    toc: extractToc(body),
    searchText: stripMarkdownForSearch(body),
  };
}
