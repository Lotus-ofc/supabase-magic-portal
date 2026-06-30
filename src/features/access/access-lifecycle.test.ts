import { describe, expect, it } from "vitest";
import {
  canAccessPlatform,
  canTransitionLifecycle,
  resolveEffectiveStatus,
} from "./access-lifecycle";
import type { AuthUserSnapshot } from "./types";

const baseUser = (over: Partial<AuthUserSnapshot> = {}): AuthUserSnapshot => ({
  id: "u1",
  email: "a@b.com",
  created_at: "2025-01-01T00:00:00Z",
  last_sign_in_at: null,
  invited_at: "2025-01-02T00:00:00Z",
  confirmation_sent_at: null,
  email_confirmed_at: null,
  banned_until: null,
  user_metadata: {},
  ...over,
});

describe("access-lifecycle", () => {
  it("permite transição invite_pending → awaiting_password", () => {
    expect(canTransitionLifecycle("invite_pending", "awaiting_password")).toBe(true);
  });

  it("bloqueia transição invite_pending → active direta", () => {
    expect(canTransitionLifecycle("invite_pending", "active")).toBe(false);
  });

  it("permite restart onboarding active → invite_pending", () => {
    expect(canTransitionLifecycle("active", "invite_pending")).toBe(true);
  });

  it("resolve banned como revoked", () => {
    const effective = resolveEffectiveStatus(
      "active",
      baseUser({ banned_until: new Date(Date.now() + 86400000).toISOString() }),
    );
    expect(effective).toBe("revoked");
  });

  it("active sem onboarding metadata vira awaiting_password", () => {
    const effective = resolveEffectiveStatus("active", baseUser());
    expect(effective).toBe("awaiting_password");
  });

  it("canAccessPlatform só quando active efetivo", () => {
    expect(
      canAccessPlatform(
        "active",
        baseUser({
          user_metadata: {
            lots_bi: {
              password_set_at: "2025-01-03T00:00:00Z",
              onboarding_completed_at: "2025-01-03T00:00:00Z",
            },
          },
        }),
      ),
    ).toBe(true);
    expect(canAccessPlatform("active", baseUser())).toBe(false);
  });
});
