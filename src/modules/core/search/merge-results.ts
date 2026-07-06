import type { SearchResult } from "./types/search";

/** Agrupa resultados client + server — client-safe. */
export function mergeSearchResults(...batches: SearchResult[][]): SearchResult[] {
  const seen = new Set<string>();
  const merged: SearchResult[] = [];
  for (const batch of batches) {
    for (const r of batch) {
      const key = `${r.group}:${r.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(r);
    }
  }
  return merged.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 24);
}
