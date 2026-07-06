import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyTask } from "../types/operations";

const SELECT =
  "id,cadastro_cliente_id,titulo,descricao,prioridade,due_at,agenda_date,responsavel_user_id,status,completed_at,completed_on_date,created_at,updated_at";

function mapRow(row: Record<string, unknown>): AgencyTask {
  return {
    id: row.id as string,
    cadastro_cliente_id: row.cadastro_cliente_id as number,
    titulo: row.titulo as string,
    descricao: (row.descricao as string | null) ?? null,
    prioridade: row.prioridade as AgencyTask["prioridade"],
    due_at: (row.due_at as string | null) ?? null,
    agenda_date: (row.agenda_date as string | null) ?? null,
    responsavel_user_id: (row.responsavel_user_id as string | null) ?? null,
    status: row.status as AgencyTask["status"],
    completed_at: (row.completed_at as string | null) ?? null,
    completed_on_date: (row.completed_on_date as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export const agencyTaskRepository = {
  async listOpen(supabase: SupabaseClient) {
    const { data, error } = await supabase
      .from("agency_tasks")
      .select(SELECT)
      .eq("status", "open")
      .order("agenda_date", { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
  },

  async listByClient(supabase: SupabaseClient, clienteId: number) {
    const { data, error } = await supabase
      .from("agency_tasks")
      .select(SELECT)
      .eq("cadastro_cliente_id", clienteId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
  },

  async complete(supabase: SupabaseClient, id: string) {
    const now = new Date();
    const { error } = await supabase
      .from("agency_tasks")
      .update({
        status: "completed",
        completed_at: now.toISOString(),
        completed_on_date: now.toISOString().slice(0, 10),
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async create(
    supabase: SupabaseClient,
    input: {
      cadastro_cliente_id: number;
      titulo: string;
      descricao?: string | null;
      prioridade?: AgencyTask["prioridade"];
      due_at?: string | null;
      agenda_date?: string | null;
      created_by?: string | null;
    },
  ) {
    const { data, error } = await supabase
      .from("agency_tasks")
      .insert({
        cadastro_cliente_id: input.cadastro_cliente_id,
        titulo: input.titulo,
        descricao: input.descricao ?? null,
        prioridade: input.prioridade ?? "C",
        due_at: input.due_at ?? null,
        agenda_date: input.agenda_date ?? null,
        status: "open",
        created_by: input.created_by ?? null,
      })
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return mapRow(data as Record<string, unknown>);
  },
};
