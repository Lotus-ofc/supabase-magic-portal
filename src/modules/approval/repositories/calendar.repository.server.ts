import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentCard } from "../types/content-card";
import { mapContentCardRow } from "./row-mappers";
import { resolveCalendarRange, type CalendarView } from "../services/calendar-date-utils";

const TABLE = "content_cards";

export type CalendarMonthFilters = {
  cadastroClienteId: number;
  year: number;
  month: number;
};

export type CalendarRangeFilters = {
  cadastroClienteId: number;
  from: string;
  to: string;
  estrategiaId?: string;
};

function monthBounds(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

async function queryRange(
  supabase: SupabaseClient,
  filters: {
    from: string;
    to: string;
    cadastroClienteId?: number;
    cadastroClienteIds?: number[];
    clientNames?: string[];
    estrategiaId?: string;
  },
): Promise<ContentCard[]> {
  let query = supabase
    .from(TABLE)
    .select("*")
    .gte("data_publicacao", filters.from)
    .lte("data_publicacao", filters.to)
    .neq("status", "arquivado")
    .order("data_publicacao", { ascending: true })
    .order("hora_publicacao", { ascending: true, nullsFirst: false });

  if (filters.cadastroClienteId != null) {
    query = query.eq("cadastro_cliente_id", filters.cadastroClienteId);
  } else if (filters.cadastroClienteIds?.length) {
    query = query.in("cadastro_cliente_id", filters.cadastroClienteIds);
  } else if (filters.clientNames?.length) {
    query = query.in("cliente_nome", filters.clientNames);
  }

  if (filters.estrategiaId) {
    query = query.eq("estrategia_id", filters.estrategiaId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapContentCardRow);
}

export const calendarRepository = {
  async listByMonth(
    supabase: SupabaseClient,
    filters: CalendarMonthFilters,
  ): Promise<ContentCard[]> {
    const { from, to } = monthBounds(filters.year, filters.month);
    return queryRange(supabase, { from, to, cadastroClienteId: filters.cadastroClienteId });
  },

  async listByDateRange(
    supabase: SupabaseClient,
    filters: CalendarRangeFilters,
  ): Promise<ContentCard[]> {
    return queryRange(supabase, {
      from: filters.from,
      to: filters.to,
      cadastroClienteId: filters.cadastroClienteId,
      estrategiaId: filters.estrategiaId,
    });
  },

  async listForCadastroClienteIdsByDateRange(
    supabase: SupabaseClient,
    cadastroClienteIds: number[],
    from: string,
    to: string,
  ): Promise<ContentCard[]> {
    if (cadastroClienteIds.length === 0) return [];
    return queryRange(supabase, { from, to, cadastroClienteIds });
  },

  async listForClientNamesByDateRange(
    supabase: SupabaseClient,
    clientNames: string[],
    from: string,
    to: string,
  ): Promise<ContentCard[]> {
    if (clientNames.length === 0) return [];
    return queryRange(supabase, { from, to, clientNames });
  },

  resolveRange(view: CalendarView, anchorIso: string) {
    return resolveCalendarRange(view, anchorIso);
  },
};

export type CalendarRepository = typeof calendarRepository;
