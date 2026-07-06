import type { ContentCard } from "../types/content-card";

export function groupCardsByDate(cards: ContentCard[]): Map<string, ContentCard[]> {
  const map = new Map<string, ContentCard[]>();
  for (const card of cards) {
    const key = card.data_publicacao;
    const list = map.get(key) ?? [];
    list.push(card);
    map.set(key, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => {
      const ha = a.hora_publicacao ?? "";
      const hb = b.hora_publicacao ?? "";
      if (ha !== hb) return ha.localeCompare(hb);
      return a.titulo.localeCompare(b.titulo);
    });
  }
  return map;
}

export function buildPillarMap(
  pillars: { id: string; titulo: string; cor: string; objetivo: string | null }[],
): Record<string, { titulo: string; cor: string; objetivo: string | null }> {
  const map: Record<string, { titulo: string; cor: string; objetivo: string | null }> = {};
  for (const p of pillars) {
    map[p.id] = { titulo: p.titulo, cor: p.cor, objetivo: p.objetivo };
  }
  return map;
}
