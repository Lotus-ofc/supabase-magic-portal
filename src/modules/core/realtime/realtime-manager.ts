import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

type ChannelHandler = (payload: unknown) => void;

interface ManagedChannel {
  channel: RealtimeChannel;
  handlers: Map<string, ChannelHandler[]>;
}

/**
 * Centraliza assinaturas Supabase Realtime.
 * Componentes nunca chamam supabase.channel() diretamente.
 */
export class RealtimeManager {
  private channels = new Map<string, ManagedChannel>();

  subscribe(
    supabase: SupabaseClient,
    channelKey: string,
    table: string,
    event: "INSERT" | "UPDATE" | "DELETE" | "*",
    handler: ChannelHandler,
    filter?: string,
  ): () => void {
    let managed = this.channels.get(channelKey);
    if (!managed) {
      const channel = supabase.channel(channelKey);
      managed = { channel, handlers: new Map() };
      this.channels.set(channelKey, managed);
      channel.subscribe();
    }

    const handlerKey = `${table}:${event}:${filter ?? "*"}`;
    const list = managed.handlers.get(handlerKey) ?? [];
    list.push(handler);
    managed.handlers.set(handlerKey, list);

    managed.channel.on(
      "postgres_changes",
      { event, schema: "public", table, filter },
      (payload) => {
        for (const h of managed!.handlers.get(handlerKey) ?? []) {
          h(payload);
        }
      },
    );

    return () => {
      const handlers = managed!.handlers.get(handlerKey) ?? [];
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
      if (handlers.length === 0) {
        managed!.handlers.delete(handlerKey);
      }
      if (managed!.handlers.size === 0) {
        void supabase.removeChannel(managed!.channel);
        this.channels.delete(channelKey);
      }
    };
  }

  unsubscribeAll(supabase: SupabaseClient): void {
    for (const [, managed] of this.channels) {
      void supabase.removeChannel(managed.channel);
    }
    this.channels.clear();
  }
}

export const realtimeManager = new RealtimeManager();
