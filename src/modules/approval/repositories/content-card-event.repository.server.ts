import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentCardEvent, ContentCardEventInsert } from "../types/content-card-event";
import { mapContentCardEventRow } from "./row-mappers";

const TABLE = "content_card_events";

export const contentCardEventRepository = {
  async listByCardId(supabase: SupabaseClient, cardId: string): Promise<ContentCardEvent[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("card_id", cardId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapContentCardEventRow);
  },

  /** Append-only — única operação de escrita permitida. */
  async append(supabase: SupabaseClient, event: ContentCardEventInsert): Promise<ContentCardEvent> {
    const { data, error } = await supabase.from(TABLE).insert(event).select("*").single();
    if (error) throw new Error(error.message);
    return mapContentCardEventRow(data);
  },
};

export type ContentCardEventRepository = typeof contentCardEventRepository;
