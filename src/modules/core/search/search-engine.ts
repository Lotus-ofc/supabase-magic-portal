import type { SearchContext, SearchProvider, SearchResult } from "../types/search";
import { configRegistry } from "../registry/config-registry";

class SearchEngine {
  private serverProviders: SearchProvider[] = [];

  /** Providers que rodam no cliente (rotas estáticas, etc.). */
  getClientProviders(): SearchProvider[] {
    return configRegistry.allSearchProviders().filter((p) => !this.serverProviders.includes(p));
  }

  registerServerProvider(provider: SearchProvider): void {
    this.serverProviders.push(provider);
  }

  /** Busca síncrona — apenas providers client-side. */
  searchLocal(ctx: SearchContext): SearchResult[] {
    const results: SearchResult[] = [];
    const seen = new Set<string>();

    for (const provider of configRegistry.allSearchProviders()) {
      if (provider.adminOnly && !ctx.isAdmin) continue;
      if (ctx.query.length < (provider.minQueryLength ?? 0)) continue;

      const batch = provider.search(ctx);
      if (batch instanceof Promise) continue;

      for (const r of batch) {
        const key = `${r.group}:${r.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push(r);
      }
    }

    return results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  async search(ctx: SearchContext): Promise<SearchResult[]> {
    const providers = [
      ...configRegistry.allSearchProviders(),
      ...this.serverProviders,
    ];

    const results: SearchResult[] = [];
    const seen = new Set<string>();

    for (const provider of providers) {
      if (provider.adminOnly && !ctx.isAdmin) continue;
      if (ctx.query.length < (provider.minQueryLength ?? 0)) continue;

      const batch = await provider.search(ctx);
      for (const r of batch) {
        const key = `${r.group}:${r.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push(r);
      }
    }

    return results
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 24);
  }

  groupResults(results: SearchResult[]): [string, SearchResult[]][] {
    const map = new Map<string, SearchResult[]>();
    for (const r of results) {
      const list = map.get(r.group) ?? [];
      list.push(r);
      map.set(r.group, list);
    }
    return [...map.entries()];
  }
}

export const searchEngine = new SearchEngine();
