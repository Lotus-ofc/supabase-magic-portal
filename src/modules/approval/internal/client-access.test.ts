import { describe, expect, it, vi } from "vitest";
import { getClientAccessScope } from "./client-access.server";

function mockSupabase(rows: { cliente_nome: string; cadastro_cliente_id: number | null }[]) {
  return {
    from: vi.fn((table: string) => {
      if (table === "client_access") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(async () => ({ data: rows, error: null })),
          })),
        };
      }
      if (table === "cadastro_clientes") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(async () => ({
              data: [{ id: 42, nome_cliente: "Legacy Name" }],
              error: null,
            })),
          })),
        };
      }
      return {};
    }),
  } as unknown as Parameters<typeof getClientAccessScope>[0];
}

describe("getClientAccessScope", () => {
  it("returns cadastro_cliente_id from client_access", async () => {
    const supabase = mockSupabase([{ cliente_nome: "Acme", cadastro_cliente_id: 7 }]);
    const scope = await getClientAccessScope(supabase, "user-1");
    expect(scope.cadastroClienteIds).toEqual([7]);
    expect(scope.clientNames).toEqual(["Acme"]);
  });

  it("resolves missing cadastro_cliente_id via cadastro_clientes lookup", async () => {
    const supabase = mockSupabase([{ cliente_nome: "Legacy Name", cadastro_cliente_id: null }]);
    const scope = await getClientAccessScope(supabase, "user-1");
    expect(scope.cadastroClienteIds).toEqual([42]);
  });
});
