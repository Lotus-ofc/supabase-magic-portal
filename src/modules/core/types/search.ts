export interface SearchResult {
  id: string;
  label: string;
  hint?: string;
  href: string;
  group: string;
  score?: number;
}

export interface SearchContext {
  query: string;
  isAdmin: boolean;
  userId?: string | null;
}

export interface SearchProvider {
  id: string;
  module: string;
  label: string;
  minQueryLength?: number;
  adminOnly?: boolean;
  search: (ctx: SearchContext) => SearchResult[] | Promise<SearchResult[]>;
}
