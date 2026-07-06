import type { DocEntry } from "@/lib/knowledge-center/types";
import { parseRoadmapMarkdown } from "../extractors/roadmap-parser";

export function buildRoadmap(docs: Map<string, DocEntry>) {
  const doc = docs.get("11-roadmap/roadmap");
  if (!doc) {
    return { completed: [], inProgress: [], planned: [] };
  }
  return parseRoadmapMarkdown(doc.body);
}
