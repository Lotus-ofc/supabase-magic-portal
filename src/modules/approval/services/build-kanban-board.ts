import type { ContentCard } from "../types/content-card";
import type { ContentCardStatus } from "../types/content-card";
import { KANBAN_COLUMNS } from "../workflow/column-config";

export type KanbanBoard = {
  columns: Array<{
    status: ContentCardStatus;
    label: string;
    colorToken: string;
    cards: ContentCard[];
  }>;
};

/** Agrupa cards por coluna Kanban ordenados por kanban_ordem. */
export function buildKanbanBoard(cards: ContentCard[]): KanbanBoard {
  const byStatus = new Map<ContentCardStatus, ContentCard[]>();
  for (const col of KANBAN_COLUMNS) {
    byStatus.set(col.status, []);
  }
  for (const card of cards) {
    if (card.status === "arquivado") continue;
    const list = byStatus.get(card.status);
    if (list) list.push(card);
  }
  for (const list of byStatus.values()) {
    list.sort((a, b) => a.kanban_ordem - b.kanban_ordem);
  }
  return {
    columns: KANBAN_COLUMNS.map((col) => ({
      status: col.status,
      label: col.label,
      colorToken: col.colorToken,
      cards: byStatus.get(col.status) ?? [],
    })),
  };
}
