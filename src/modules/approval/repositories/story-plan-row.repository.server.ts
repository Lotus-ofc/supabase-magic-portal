import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoryPlanRow, StoryPlanRowInsert } from "../types/story-plan-row";
import { mapStoryPlanRowRow } from "./row-mappers";

const TABLE = "story_plan_rows";

export const storyPlanRowRepository = {
  async listByClientWeek(
    supabase: SupabaseClient,
    cadastroClienteId: number,
    semanaInicio: string,
  ): Promise<StoryPlanRow[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("cadastro_cliente_id", cadastroClienteId)
      .eq("semana_inicio", semanaInicio)
      .order("dia_semana", { ascending: true })
      .order("ordem", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapStoryPlanRowRow);
  },

  async listForCadastroClienteIds(
    supabase: SupabaseClient,
    cadastroClienteIds: number[],
    semanaInicio: string,
  ): Promise<StoryPlanRow[]> {
    if (cadastroClienteIds.length === 0) return [];

    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .in("cadastro_cliente_id", cadastroClienteIds)
      .eq("semana_inicio", semanaInicio)
      .order("dia_semana", { ascending: true })
      .order("ordem", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapStoryPlanRowRow);
  },

  async listForClientNames(
    supabase: SupabaseClient,
    clientNames: string[],
    semanaInicio: string,
  ): Promise<StoryPlanRow[]> {
    if (clientNames.length === 0) return [];
    const { data: clientes, error: ce } = await supabase
      .from("cadastro_clientes")
      .select("id")
      .in("nome_cliente", clientNames);
    if (ce) throw new Error(ce.message);
    const ids = (clientes ?? []).map((c) => c.id);
    if (ids.length === 0) return [];

    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .in("cadastro_cliente_id", ids)
      .eq("semana_inicio", semanaInicio)
      .order("dia_semana", { ascending: true })
      .order("ordem", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapStoryPlanRowRow);
  },

  async findById(supabase: SupabaseClient, id: string): Promise<StoryPlanRow | null> {
    const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapStoryPlanRowRow(data) : null;
  },

  async insert(supabase: SupabaseClient, row: StoryPlanRowInsert): Promise<StoryPlanRow> {
    const { data, error } = await supabase.from(TABLE).insert(row).select("*").single();
    if (error) throw new Error(error.message);
    return mapStoryPlanRowRow(data);
  },

  async update(
    supabase: SupabaseClient,
    id: string,
    patch: Partial<StoryPlanRowInsert>,
  ): Promise<StoryPlanRow> {
    const { data, error } = await supabase
      .from(TABLE)
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapStoryPlanRowRow(data);
  },

  async delete(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};

export type StoryPlanRowRepository = typeof storyPlanRowRepository;
