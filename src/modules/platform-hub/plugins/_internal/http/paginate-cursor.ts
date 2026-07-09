export interface CursorPageV1<T> {
  data: T[];
  nextCursor?: string;
}

export interface PaginateCursorOptions<T> {
  fetchPage: (cursor?: string) => Promise<CursorPageV1<T>>;
  maxPages?: number;
}

/** Paginação genérica por cursor — Graph API, TikTok, Google, etc. */
export async function paginateCursorPages<T>(
  options: PaginateCursorOptions<T>,
): Promise<{ items: T[]; pagesFetched: number }> {
  const maxPages = options.maxPages ?? 50;
  const items: T[] = [];
  let cursor: string | undefined;
  let pagesFetched = 0;

  while (pagesFetched < maxPages) {
    const page = await options.fetchPage(cursor);
    items.push(...page.data);
    pagesFetched += 1;
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }

  return { items, pagesFetched };
}
