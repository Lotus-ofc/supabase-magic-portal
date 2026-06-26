export type DocStatus = "draft" | "living" | "deprecated" | "archived" | string;

export type DocDifficulty = "beginner" | "intermediate" | "advanced" | string;

export interface DocFrontmatter {
  title?: string;
  description?: string;
  author?: string;
  owner?: string;
  status?: DocStatus;
  tags?: string[];
  related?: string[];
  difficulty?: DocDifficulty;
  created?: string;
  updated?: string;
  last_review?: string;
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface DocEntry {
  slug: string;
  /** Path relative to docs/ without extension, e.g. `02-architecture/overview` */
  path: string;
  frontmatter: DocFrontmatter;
  body: string;
  title: string;
  description: string;
  toc: TocItem[];
  /** Plain text for search (body without markdown noise) */
  searchText: string;
}

export type NavNodeType = "category" | "folder" | "doc";

export interface NavNode {
  id: string;
  type: NavNodeType;
  label: string;
  slug?: string;
  children?: NavNode[];
  order: number;
}

export interface SearchHit {
  slug: string;
  title: string;
  description: string;
  path: string;
  tags: string[];
}
