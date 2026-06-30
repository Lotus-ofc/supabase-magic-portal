import { describe, expect, it } from "vitest";
import { reconcileLifecycle } from "@/features/access/access-reconciliation";
import { canTransitionLifecycle } from "@/features/access/access-lifecycle";
import { buildAuthRecoveryCallbackUrl } from "@/lib/app-url";
import { inferAuthFlowFromSession } from "@/features/auth/auth-callback-inference";
import type { AuthUserSnapshot } from "@/features/access/types";
import type { Session } from "@supabase/supabase-js";

const legacyUser = (): AuthUserSnapshot => ({
  id: "legacy-1",
  email: "legacy@test.com",
  created_at: "2024-06-01T00:00:00Z",
  last_sign_in_at: "2024-12-01T00:00:00Z",
  invited_at: null,
  confirmation_sent_at: null,
  email_confirmed_at: "2024-06-02T00:00:00Z",
  banned_until: null,
  user_metadata: {},
});

describe("auth stabilization", () => {
  it("recovery callback URL inclui flow=recovery", () => {
    expect(buildAuthRecoveryCallbackUrl("https://app.test")).toBe(
      "https://app.test/auth/callback?flow=recovery",
    );
  });

  it("recovery inferido mesmo com onboarding completo quando flow hint presente", () => {
    const session = {
      access_token: "t",
      user: {
        id: "u1",
        user_metadata: {
          lots_bi: {
            password_set_at: "2025-01-01T00:00:00Z",
            onboarding_completed_at: "2025-01-01T00:00:00Z",
          },
        },
      },
    } as Session;
    expect(inferAuthFlowFromSession(session, null, "recovery")).toBe("recovery");
  });

  it("usuário legado active sem metadata reconcilia para awaiting_password", () => {
    const result = reconcileLifecycle("legacy-1", "active", legacyUser());
    expect(result.suggested_status).toBe("awaiting_password");
  });

  it("transições recovery mode cobrem reenvio e restart", () => {
    expect(canTransitionLifecycle("invite_expired", "invite_pending")).toBe(true);
    expect(canTransitionLifecycle("awaiting_password", "invite_pending")).toBe(true);
    expect(canTransitionLifecycle("active", "invite_pending")).toBe(true);
    expect(canTransitionLifecycle("revoked", "active")).toBe(true);
    expect(canTransitionLifecycle("disabled", "active")).toBe(true);
  });
});
