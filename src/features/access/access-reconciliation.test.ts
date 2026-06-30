import { describe, expect, it } from "vitest";
import { reconcileLifecycle } from "./access-reconciliation";
import type { AuthUserSnapshot } from "./types";

const user = (
  meta: Record<string, unknown> = {},
  lastSignIn: string | null = null,
): AuthUserSnapshot => ({
  id: "u1",
  email: "a@b.com",
  created_at: "2025-01-01T00:00:00Z",
  last_sign_in_at: lastSignIn,
  invited_at: "2025-01-02T00:00:00Z",
  confirmation_sent_at: null,
  email_confirmed_at: null,
  banned_until: null,
  user_metadata: meta,
});

describe("access-reconciliation", () => {
  it("detecta active sem metadata → awaiting_password", () => {
    const r = reconcileLifecycle("u1", "active", user());
    expect(r.changed).toBe(true);
    expect(r.suggested_status).toBe("awaiting_password");
  });

  it("detecta onboarding completo em awaiting_password → active", () => {
    const r = reconcileLifecycle(
      "u1",
      "awaiting_password",
      user({
        lots_bi: {
          password_set_at: "2025-01-03T00:00:00Z",
          onboarding_completed_at: "2025-01-03T00:00:00Z",
        },
      }),
    );
    expect(r.suggested_status).toBe("active");
  });
});
