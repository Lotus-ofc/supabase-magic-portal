import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentCard, ContentCardInsert, ContentCardUpdate } from "../types/content-card";
import { isHardDeleteForbidden } from "../services/workflow-rules";
import { mapContentCardRow } from "./row-mappers";

const TABLE = "content_cards";

export type ContentCardListFilters = {
  cadastroClienteId: number;
  status?: ContentCard["status"] | ContentCard["status"][];
  excludeArchived?: boolean;
};

export const contentCardRepository = {
  async findById(supabase: SupabaseClient, id: string): Promise<ContentCard | null> {
    const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapContentCardRow(data) : null;
  },

  async listByClient(
    supabase: SupabaseClient,
    filters: ContentCardListFilters,
  ): Promise<ContentCard[]> {
    let query = supabase
      .from(TABLE)
      .select("*")
      .eq("cadastro_cliente_id", filters.cadastroClienteId)
      .order("kanban_ordem", { ascending: true });

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      query = query.in("status", statuses);
    } else if (filters.excludeArchived) {
      query = query.neq("status", "arquivado");
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapContentCardRow);
  },

  /** Lista cards do portal cliente — escopo por cadastro_cliente_id (mesma chave do admin). */
  async listForCadastroClienteIds(
    supabase: SupabaseClient,
    cadastroClienteIds: number[],
    options?: { excludeArchived?: boolean },
  ): Promise<ContentCard[]> {
    if (cadastroClienteIds.length === 0) return [];

    let query = supabase
      .from(TABLE)
      .select("*")
      .in("cadastro_cliente_id", cadastroClienteIds)
      .order("data_publicacao", { ascending: true })
      .order("kanban_ordem", { ascending: true });

    if (options?.excludeArchived) {
      query = query.neq("status", "arquivado");
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapContentCardRow);
  },

  /** @deprecated Use listForCadastroClienteIds */
  async listForClientNames(
    supabase: SupabaseClient,
    clientNames: string[],
    options?: { excludeArchived?: boolean },
  ): Promise<ContentCard[]> {
    if (clientNames.length === 0) return [];

    let query = supabase
      .from(TABLE)
      .select("*")
      .in("cliente_nome", clientNames)
      .order("data_publicacao", { ascending: true })
      .order("kanban_ordem", { ascending: true });

    if (options?.excludeArchived) {
      query = query.neq("status", "arquivado");
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapContentCardRow);
  },

  async findByIdForCadastroClienteIds(
    supabase: SupabaseClient,
    id: string,
    cadastroClienteIds: number[],
  ): Promise<ContentCard | null> {
    if (cadastroClienteIds.length === 0) return null;
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .in("cadastro_cliente_id", cadastroClienteIds)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapContentCardRow(data) : null;
  },

  async findByIdForClientNames(
    supabase: SupabaseClient,
    id: string,
    clientNames: string[],
  ): Promise<ContentCard | null> {
    if (clientNames.length === 0) return null;
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .in("cliente_nome", clientNames)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapContentCardRow(data) : null;
  },

  async insert(supabase: SupabaseClient, row: ContentCardInsert): Promise<ContentCard> {
    const { data, error } = await supabase.from(TABLE).insert(row).select("*").single();
    if (error) throw new Error(error.message);
    return mapContentCardRow(data);
  },

  async update(
    supabase: SupabaseClient,
    id: string,
    patch: ContentCardUpdate,
  ): Promise<ContentCard> {
    const { data, error } = await supabase
      .from(TABLE)
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapContentCardRow(data);
  },

  async delete(supabase: SupabaseClient, id: string): Promise<void> {
    const existing = await contentCardRepository.findById(supabase, id);
    if (existing && isHardDeleteForbidden(existing.status)) {
      throw new Error("Exclusão permanente proibida para conteúdos publicados ou arquivados.");
    }
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};

export type ContentCardRepository = typeof contentCardRepository;
