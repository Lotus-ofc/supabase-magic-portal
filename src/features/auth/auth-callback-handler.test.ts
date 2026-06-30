import { describe, expect, it, vi } from "vitest";
import { completeAuthCallback } from "./auth-callback-handler";
import type { AuthCallbackParams } from "./auth-callback";

function mockSupabase(handlers: {
  getSession: () => Promise<{ data: { session: unknown }; error: null }>;
  verifyOtp?: () => Promise<{ error: null }>;
  exchangeCodeForSession?: () => Promise<{ error: { message: string } | null }>;
}) {
  return {
    auth: {
      getSession: vi.fn(handlers.getSession),
      verifyOtp: vi.fn(handlers.verifyOtp ?? (async () => ({ error: null }))),
      exchangeCodeForSession: vi.fn(
        handlers.exchangeCodeForSession ?? (async () => ({ error: null })),
      ),
    },
  } as unknown as Parameters<typeof completeAuthCallback>[0];
}

const baseParams = (over: Partial<AuthCallbackParams> = {}): AuthCallbackParams => ({
  token_hash: null,
  type: null,
  code: null,
  error: null,
  error_description: null,
  has_implicit_tokens: false,
  flow_hint: null,
  ...over,
});

const inviteSession = {
  access_token: "t",
  user: {
    id: "u1",
    invited_at: "2025-01-02T00:00:00Z",
    user_metadata: {},
  },
};

describe("completeAuthCallback", () => {
  it("falha quando params.error", async () => {
    const result = await completeAuthCallback(
      mockSupabase({ getSession: async () => ({ data: { session: null }, error: null }) }),
      baseParams({ error: "access_denied", error_description: "Convite expirado" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("Convite expirado");
  });

  it("nunca retorna ok sem sessão válida após verifyOtp", async () => {
    const supabase = mockSupabase({
      getSession: async () => ({ data: { session: null }, error: null }),
    });
    const result = await completeAuthCallback(
      supabase,
      baseParams({ token_hash: "hash", type: "invite" }),
    );
    expect(result.ok).toBe(false);
    expect(supabase.auth.verifyOtp).toHaveBeenCalled();
  });

  it("retorna flow invite após sessão implícita (hash consumido pelo SDK)", async () => {
    const supabase = mockSupabase({
      getSession: async () => ({ data: { session: inviteSession }, error: null }),
    });
    const result = await completeAuthCallback(supabase, baseParams({ has_implicit_tokens: true }));
    expect(result).toEqual({ ok: true, flow: "invite", sessionEstablished: true });
  });

  it("usa token_hash + type quando presentes", async () => {
    const supabase = mockSupabase({
      getSession: async () => ({
        data: { session: { access_token: "t", user: { id: "u1", user_metadata: {} } } },
        error: null,
      }),
    });
    const result = await completeAuthCallback(
      supabase,
      baseParams({ token_hash: "abc", type: "recovery" }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.flow).toBe("recovery");
  });

  it("infere recovery via flow_hint na query", async () => {
    const supabase = mockSupabase({
      getSession: async () => ({
        data: {
          session: {
            access_token: "t",
            user: {
              id: "u1",
              user_metadata: {
                lots_bi: {
                  password_set_at: "2025-01-03T00:00:00Z",
                  onboarding_completed_at: "2025-01-03T00:00:00Z",
                },
              },
            },
          },
        },
        error: null,
      }),
    });
    const result = await completeAuthCallback(
      supabase,
      baseParams({ flow_hint: "recovery", has_implicit_tokens: true }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.flow).toBe("recovery");
  });
});
