/** Normaliza nome canônico do cliente antes da escrita. */
export function normalizeCanonicalClientName(raw: string): string {
  return raw.trim();
}
