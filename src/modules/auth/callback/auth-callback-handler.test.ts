import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { completeAuthCallback } from "./auth-callback-handler";
import type { AuthCallbackParams } from "./auth-callback";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

async function runCallback(
  supabase: Parameters<typeof completeAuthCallback>[0],
  params: AuthCallbackParams,
) {
  const promise = completeAuthCallback(supabase, params);
  await vi.runAllTimersAsync();
  return promise;
}

function mockSupabase(handlers: {
  getSession: () => Promise<{ data: { session: unknown }; error: null }>;
  verifyOtp?: () => Promise<{ error: null }>;
  exchangeCodeForSession?: () => Promise<{
    data: { redirectType: string | null; session: unknown; user: unknown } | null;
    error: { message: string } | null;
  }>;
  onAuthStateChange?: (cb: (event: string) => void) => {
    data: { subscription: { unsubscribe: () => void } };
  };
}) {
  return {
    auth: {
      getSession: vi.fn(handlers.getSession),
      verifyOtp: vi.fn(handlers.verifyOtp ?? (async () => ({ error: null }))),
      exchangeCodeForSession: vi.fn(
        handlers.exchangeCodeForSession ??
          (async () => ({
            data: { redirectType: null, session: null, user: null },
            error: null,
          })),
      ),
      onAuthStateChange: vi.fn(
        handlers.onAuthStateChange ??
          ((cb: (event: string) => void) => {
            cb("INITIAL_SESSION");
            return { data: { subscription: { unsubscribe: vi.fn() } } };
          }),
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

const activeSession = {
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
};

describe("completeAuthCallback", () => {
  it("falha quando params.error", async () => {
    const result = await runCallback(
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
    const result = await runCallback(supabase, baseParams({ token_hash: "hash", type: "invite" }));
    expect(result.ok).toBe(false);
    expect(supabase.auth.verifyOtp).toHaveBeenCalled();
  });

  it("infere invite via invited_at quando hash foi consumido pelo SDK", async () => {
    const supabase = mockSupabase({
      getSession: async () => ({ data: { session: inviteSession }, error: null }),
    });
    const result = await runCallback(supabase, baseParams());
    expect(result).toEqual({ ok: true, flow: "invite", sessionEstablished: true });
  });

  it("usa token_hash + type recovery", async () => {
    const supabase = mockSupabase({
      getSession: async () => ({ data: { session: activeSession }, error: null }),
    });
    const result = await runCallback(supabase, baseParams({ token_hash: "abc", type: "recovery" }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.flow).toBe("recovery");
  });

  it("infere recovery via redirectType PKCE", async () => {
    const supabase = mockSupabase({
      getSession: async () => ({ data: { session: activeSession }, error: null }),
      exchangeCodeForSession: async () => ({
        data: { redirectType: "recovery", session: activeSession, user: activeSession.user },
        error: null,
      }),
    });
    const result = await runCallback(supabase, baseParams({ code: "pkce-code" }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.flow).toBe("recovery");
  });

  it("infere recovery via evento PASSWORD_RECOVERY", async () => {
    const supabase = mockSupabase({
      getSession: async () => ({ data: { session: activeSession }, error: null }),
      onAuthStateChange: (cb) => {
        cb("PASSWORD_RECOVERY");
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    });
    const result = await runCallback(supabase, baseParams());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.flow).toBe("recovery");
  });
});
