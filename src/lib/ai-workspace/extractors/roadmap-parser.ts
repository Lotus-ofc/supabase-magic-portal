import type { RoadmapItem, RoadmapSnapshot } from "../types";

const COMPLETED_RE = /✅/;
const IN_PROGRESS_RE = /🔧|🎯/;
const PLANNED_RE = /✨/;

function cleanItem(line: string): string {
  return line
    .replace(/^[\s>*-]+/, "")
    .replace(/^[✅🔧✨🎯📄]+\s*/u, "")
    .replace(/\*\*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

type RoadmapCategory = keyof RoadmapSnapshot;

function classifyLine(line: string): RoadmapCategory | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("|") || trimmed.startsWith("```")) {
    return null;
  }
  if (!trimmed.match(/^[-*]|^✅|^🔧|^✨|^🎯/)) return null;

  const text = cleanItem(trimmed);
  if (!text || text.length < 4) return null;

  if (COMPLETED_RE.test(trimmed)) return "completed";
  if (IN_PROGRESS_RE.test(trimmed) && !COMPLETED_RE.test(trimmed)) return "inProgress";
  if (PLANNED_RE.test(trimmed)) return "planned";
  if (trimmed.startsWith("-") && /próxim|evolu|futur|pendente/i.test(text)) return "planned";
  return "inProgress";
}

export function parseRoadmapMarkdown(body: string): RoadmapSnapshot {
  const result: RoadmapSnapshot = { completed: [], inProgress: [], planned: [] };
  let inPlannedSection = false;

  for (const line of body.split("\n")) {
    if (/^#{2,4}\s+.*(próxim|evolu|futur|pendente|planejad)/i.test(line)) {
      inPlannedSection = true;
      continue;
    }
    if (/^#{2,4}\s+/.test(line) && !/^#{2,4}\s+.*(próxim|evolu|futur)/i.test(line)) {
      inPlannedSection = false;
    }

    const category = classifyLine(line);
    if (!category) continue;

    const item: RoadmapItem = { text: cleanItem(line) };
    if (category === "completed") result.completed.push(item);
    else if (category === "planned" || inPlannedSection) result.planned.push(item);
    else result.inProgress.push(item);
  }

  return result;
}
