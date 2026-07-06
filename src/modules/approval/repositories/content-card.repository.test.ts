import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { contentCardRepository } from "./content-card.repository.server";

function chainable(result: { data: unknown; error: unknown }) {
  const self = {
    select: vi.fn(() => self),
    eq: vi.fn(() => self),
    neq: vi.fn(() => self),
    in: vi.fn(() => self),
    order: vi.fn(() => self),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
    insert: vi.fn(() => self),
    update: vi.fn(() => self),
  };
  return self;
}

describe("contentCardRepository", () => {
  it("findById returns mapped card or null", async () => {
    const row = {
      id: "c1",
      cadastro_cliente_id: 1,
      cliente_nome: "X",
      data_publicacao: "2026-07-01",
      hora_publicacao: null,
      titulo: "T",
      legenda: null,
      copy_text: null,
      roteiro: null,
      direcao_arte: null,
      cta: null,
      plataforma: "instagram",
      formato: null,
      capa_url: null,
      status: "producao",
      checklist: [],
      localizacao: null,
      tags: null,
      observacoes: null,
      responsavel_email: null,
      responsavel_user_id: null,
      pilar_id: null,
      estrategia_id: null,
      kanban_ordem: 0,
      published_at: null,
      archived_at: null,
      ai_metadata: {},
      integration_metadata: {},
      legacy_post_id: null,
      created_by: null,
      created_at: "2026-07-01T00:00:00Z",
      updated_at: "2026-07-01T00:00:00Z",
    };
    const chain = chainable({ data: row, error: null });
    const supabase = { from: vi.fn(() => chain) } as unknown as SupabaseClient;

    const card = await contentCardRepository.findById(supabase, "c1");
    expect(card?.id).toBe("c1");
    expect(supabase.from).toHaveBeenCalledWith("content_cards");
  });

  it("throws on supabase error", async () => {
    const chain = chainable({ data: null, error: { message: "db fail" } });
    const supabase = { from: vi.fn(() => chain) } as unknown as SupabaseClient;
    await expect(contentCardRepository.findById(supabase, "c1")).rejects.toThrow("db fail");
  });
});
