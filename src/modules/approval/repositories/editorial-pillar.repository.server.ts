import type { SupabaseClient } from "@supabase/supabase-js";
import type { EditorialPillar, EditorialPillarInsert } from "../types/editorial-pillar";
import { mapEditorialPillarRow } from "./row-mappers";

const TABLE = "editorial_pillars";

export const editorialPillarRepository = {
  async listByClient(
    supabase: SupabaseClient,
    cadastroClienteId: number,
    activeOnly = true,
  ): Promise<EditorialPillar[]> {
    let query = supabase
      .from(TABLE)
      .select("*")
      .eq("cadastro_cliente_id", cadastroClienteId)
      .order("ordem", { ascending: true });
    if (activeOnly) query = query.eq("ativo", true);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapEditorialPillarRow);
  },

  async listForCadastroClienteIds(
    supabase: SupabaseClient,
    cadastroClienteIds: number[],
    activeOnly = true,
  ): Promise<EditorialPillar[]> {
    if (cadastroClienteIds.length === 0) return [];

    let query = supabase
      .from(TABLE)
      .select("*")
      .in("cadastro_cliente_id", cadastroClienteIds)
      .order("ordem", { ascending: true });
    if (activeOnly) query = query.eq("ativo", true);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapEditorialPillarRow);
  },

  async listForClientNames(
    supabase: SupabaseClient,
    clientNames: string[],
    activeOnly = true,
  ): Promise<EditorialPillar[]> {
    if (clientNames.length === 0) return [];
    const { data: clientes, error: ce } = await supabase
      .from("cadastro_clientes")
      .select("id")
      .in("nome_cliente", clientNames);
    if (ce) throw new Error(ce.message);
    const ids = (clientes ?? []).map((c) => c.id);
    if (ids.length === 0) return [];

    let query = supabase
      .from(TABLE)
      .select("*")
      .in("cadastro_cliente_id", ids)
      .order("ordem", { ascending: true });
    if (activeOnly) query = query.eq("ativo", true);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapEditorialPillarRow);
  },

  async reorder(
    supabase: SupabaseClient,
    cadastroClienteId: number,
    orderedIds: string[],
  ): Promise<EditorialPillar[]> {
    const updates = orderedIds.map((id, index) =>
      supabase
        .from(TABLE)
        .update({ ordem: index })
        .eq("id", id)
        .eq("cadastro_cliente_id", cadastroClienteId),
    );
    const results = await Promise.all(updates);
    for (const r of results) {
      if (r.error) throw new Error(r.error.message);
    }
    return editorialPillarRepository.listByClient(supabase, cadastroClienteId, false);
  },

  async findById(supabase: SupabaseClient, id: string): Promise<EditorialPillar | null> {
    const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapEditorialPillarRow(data) : null;
  },

  async insert(supabase: SupabaseClient, row: EditorialPillarInsert): Promise<EditorialPillar> {
    const { data, error } = await supabase.from(TABLE).insert(row).select("*").single();
    if (error) throw new Error(error.message);
    return mapEditorialPillarRow(data);
  },

  async update(
    supabase: SupabaseClient,
    id: string,
    patch: Partial<EditorialPillarInsert>,
  ): Promise<EditorialPillar> {
    const { data, error } = await supabase
      .from(TABLE)
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapEditorialPillarRow(data);
  },
};

export type EditorialPillarRepository = typeof editorialPillarRepository;
