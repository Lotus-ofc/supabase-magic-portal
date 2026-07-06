import type { DocEntry, NavNode } from "@/lib/knowledge-center";

export type TutorialAudience = "admin" | "client";

export type TutorialDoc = DocEntry;

export type { NavNode };

export interface TutorialRegistry {
  docs: TutorialDoc[];
  bySlug: Map<string, TutorialDoc>;
  adminNav: NavNode[];
  clientNav: NavNode[];
}
