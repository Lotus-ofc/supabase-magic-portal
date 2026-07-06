import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentCard } from "../types/content-card";
import { LIBRARY_STATUSES } from "../services/migration-helpers";
import type { LibrarySearchFilters, LibrarySearchResult } from "../library/types/library";
import { mapContentCardRow } from "./row-mappers";

const TABLE = "content_cards";

function applyLibraryFilters(
  query: ReturnType<SupabaseClient["from"]>,
  filters: LibrarySearchFilters,
  clientNames?: string[],
) {
  let q = query.in("status", LIBRARY_STATUSES).not("published_at", "is", null);

  if (clientNames?.length) {
    q = q.in("cliente_nome", clientNames);
  }
  if (filters.cadastro_cliente_id != null) {
    q = q.eq("cadastro_cliente_id", filters.cadastro_cliente_id);
  }
  if (filters.pilar_id) q = q.eq("pilar_id", filters.pilar_id);
  if (filters.plataforma) q = q.eq("plataforma", filters.plataforma);
  if (filters.formato) q = q.eq("formato", filters.formato);
  if (filters.status === "publicado") q = q.eq("status", "publicado");
  if (filters.status === "arquivado") q = q.eq("status", "arquivado");
  if (filters.q?.trim()) {
    const term = `%${filters.q.trim()}%`;
    q = q.or(`titulo.ilike.${term},cliente_nome.ilike.${term}`);
  }
  if (filters.year != null) {
    const month = filters.month ?? 1;
    const from = `${filters.year}-${String(month).padStart(2, "0")}-01`;
    const endMonth = filters.month ?? 12;
    const lastDay = new Date(filters.year, endMonth, 0).getDate();
    const toMonth = filters.month ?? endMonth;
    const to = `${filters.year}-${String(toMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    q = q.gte("published_at", `${from}T00:00:00.000Z`).lte("published_at", `${to}T23:59:59.999Z`);
  }
  if (filters.tags?.length) {
    q = q.contains("tags", filters.tags);
  }
  return q;
}

export type LibraryListFilters = LibrarySearchFilters;

export const libraryRepository = {
  async search(
    supabase: SupabaseClient,
    filters: LibrarySearchFilters,
    clientNames?: string[],
  ): Promise<LibrarySearchResult> {
    const limit = filters.limit ?? 24;
    const offset = filters.offset ?? 0;

    const countQuery = applyLibraryFilters(
      supabase.from(TABLE).select("id", { count: "exact", head: true }),
      filters,
      clientNames,
    );
    const { count, error: countError } = await countQuery;
    if (countError) throw new Error(countError.message);

    const dataQuery = applyLibraryFilters(supabase.from(TABLE).select("*"), filters, clientNames)
      .order("published_at", { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await dataQuery;
    if (error) throw new Error(error.message);

    return {
      items: (data ?? []).map(mapContentCardRow),
      total: count ?? 0,
      limit,
      offset,
    };
  },

  async findByIdInLibrary(
    supabase: SupabaseClient,
    id: string,
    clientNames?: string[],
  ): Promise<ContentCard | null> {
    let query = supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .in("status", LIBRARY_STATUSES)
      .not("published_at", "is", null);

    if (clientNames?.length) query = query.in("cliente_nome", clientNames);

    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapContentCardRow(data) : null;
  },

  /** @deprecated use search() */
  async listPublished(
    supabase: SupabaseClient,
    filters: { cadastroClienteId: number; limit?: number; offset?: number },
  ): Promise<ContentCard[]> {
    const result = await libraryRepository.search(supabase, {
      cadastro_cliente_id: filters.cadastroClienteId,
      limit: filters.limit,
      offset: filters.offset,
    });
    return result.items;
  },
};

export type LibraryRepository = typeof libraryRepository;
