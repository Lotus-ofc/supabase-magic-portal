import { describe, expect, it, vi } from "vitest";
import { clientApproveCard, clientRequestChanges } from "./client-lifecycle.server";

const actor = { userId: "u1", email: "client@test.com", role: "cliente" as const };

function mockSupabase(opts: {
  card?: Record<string, unknown> | null;
  cadastroClienteIds?: number[];
  appendError?: string | null;
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === "content_cards") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: opts.card, error: null })),
            })),
          })),
        };
      }
      if (table === "client_access") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(async () => ({
              data: (opts.cadastroClienteIds ?? [1]).map((id) => ({
                cliente_nome: "Acme",
                cadastro_cliente_id: id,
              })),
              error: null,
            })),
          })),
        };
      }
      if (table === "content_card_events") {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => {
                if (opts.appendError) return { data: null, error: { message: opts.appendError } };
                return { data: { id: "e1" }, error: null };
              }),
            })),
          })),
        };
      }
      return {};
    }),
  } as unknown as Parameters<typeof clientApproveCard>[0];
}

describe("client-lifecycle", () => {
  it("appends approved event without changing card", async () => {
    const supabase = mockSupabase({
      card: {
        id: "c1",
        cadastro_cliente_id: 1,
        cliente_nome: "Acme",
        status: "aguardando_aprovacao",
      },
      cadastroClienteIds: [1],
    });
    await clientApproveCard(supabase, actor, { card_id: "c1" });
    expect(supabase.from).toHaveBeenCalledWith("content_card_events");
  });

  it("rejects approve when not awaiting approval", async () => {
    const supabase = mockSupabase({
      card: { id: "c1", cadastro_cliente_id: 1, cliente_nome: "Acme", status: "producao" },
      cadastroClienteIds: [1],
    });
    await expect(clientApproveCard(supabase, actor, { card_id: "c1" })).rejects.toThrow(
      /aguardando aprovação/,
    );
  });

  it("appends changes_requested with message", async () => {
    const supabase = mockSupabase({
      card: {
        id: "c1",
        cadastro_cliente_id: 1,
        cliente_nome: "Acme",
        status: "aguardando_aprovacao",
      },
      cadastroClienteIds: [1],
    });
    await clientRequestChanges(supabase, actor, {
      card_id: "c1",
      mensagem: "Ajustar CTA",
    });
    expect(supabase.from).toHaveBeenCalledWith("content_card_events");
  });
});
