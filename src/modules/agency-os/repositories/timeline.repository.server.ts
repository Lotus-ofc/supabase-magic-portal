import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyTimelineEvent } from "../types";

export const agencyTimelineRepository = {
  async listRecent(supabase: SupabaseClient, limit = 20, clienteId?: number) {
    let query = supabase
      .from("agency_timeline_events")
      .select(
        "id,cadastro_cliente_id,entity_type,entity_id,event_type,title,summary,payload,actor_email,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (clienteId) query = query.eq("cadastro_cliente_id", clienteId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const events = (data ?? []) as AgencyTimelineEvent[];
    if (events.length === 0) return events;

    const clientIds = [...new Set(events.map((e) => e.cadastro_cliente_id).filter(Boolean))] as number[];
    if (clientIds.length === 0) return events;

    const { data: clients } = await supabase
      .from("cadastro_clientes")
      .select("id,nome_cliente")
      .in("id", clientIds);

    const nameById = new Map((clients ?? []).map((c) => [c.id as number, c.nome_cliente as string]));

    return events.map((e) => ({
      ...e,
      cliente_nome: e.cadastro_cliente_id ? (nameById.get(e.cadastro_cliente_id) ?? null) : null,
    }));
  },
};
