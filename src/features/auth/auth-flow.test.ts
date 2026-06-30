import { describe, expect, it } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { reconcileLifecycle } from "@/features/access/access-reconciliation";
import { canTransitionLifecycle } from "@/features/access/access-lifecycle";
import { resolveAccessBlockedRedirect, resolvePostCallbackRedirect } from "@/features/auth";
import { inferAuthFlowFromSession } from "@/features/auth/auth-callback-inference";
import type { AuthUserSnapshot } from "@/features/access/types";

const authUser = (over: Partial<AuthUserSnapshot> = {}): AuthUserSnapshot => ({
  id: "u1",
  email: "user@test.com",
  created_at: "2025-01-01T00:00:00Z",
  last_sign_in_at: null,
  invited_at: "2025-01-02T00:00:00Z",
  confirmation_sent_at: null,
  email_confirmed_at: null,
  banned_until: null,
  user_metadata: {},
  ...over,
});

const session = (meta: Record<string, unknown> = {}): Session =>
  ({
    access_token: "tok",
    user: {
      id: "u1",
      invited_at: "2025-01-02T00:00:00Z",
      user_metadata: meta,
    },
  }) as Session;

describe("auth flow v2.1", () => {
  it("convite: callback → set-password → onboarding → active", () => {
    const s = session();
    expect(inferAuthFlowFromSession(s, null)).toBe("invite");
    expect(resolvePostCallbackRedirect("invite")).toEqual({
      view: "set-password",
      context: "invite",
    });
    expect(resolvePostCallbackRedirect("login")).toEqual({ view: "login" });
  });

  it("recuperação: callback → set-password recovery", () => {
    expect(resolvePostCallbackRedirect("recovery")).toEqual({
      view: "set-password",
      context: "recovery",
    });
  });

  it("reconcilia active incorreto sem onboarding", () => {
    const result = reconcileLifecycle(
      "u1",
      "active",
      authUser({ last_sign_in_at: "2025-01-03T00:00:00Z" }),
    );
    expect(result.suggested_status).toBe("awaiting_password");
    expect(result.changed).toBe(true);
  });

  it("invite_pending com sessão conduz a set-password, não link-error", () => {
    const s = session();
    const blocked = resolveAccessBlockedRedirect("invite_pending", {
      hasSession: true,
      session: s,
    });
    expect(blocked.to).toBe("/auth");
    expect(blocked.search?.view).toBe("set-password");
    expect(blocked.signOut).toBeUndefined();
  });

  it("invite_pending sem sessão → link-error + signOut", () => {
    const blocked = resolveAccessBlockedRedirect("invite_pending");
    expect(blocked.search?.view).toBe("link-error");
    expect(blocked.signOut).toBe(true);
  });

  it("usuário active não pode transicionar de invite_pending direto", () => {
    expect(canTransitionLifecycle("invite_pending", "active")).toBe(false);
  });

  it("awaiting_password com onboarding completo reconcilia para active", () => {
    const result = reconcileLifecycle(
      "u1",
      "awaiting_password",
      authUser({
        user_metadata: {
          lots_bi: {
            password_set_at: "2025-01-03T00:00:00Z",
            onboarding_completed_at: "2025-01-03T00:00:00Z",
          },
        },
      }),
    );
    expect(result.suggested_status).toBe("active");
  });
});
