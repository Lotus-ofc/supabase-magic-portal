import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyNote } from "../types/operations";

export const agencyNoteRepository = {
  async listByClient(supabase: SupabaseClient, clienteId: number, limit = 30) {
    const { data, error } = await supabase
      .from("agency_notes")
      .select("id,cadastro_cliente_id,body,author_user_id,author_email,created_at")
      .eq("cadastro_cliente_id", clienteId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []) as AgencyNote[];
  },
};
