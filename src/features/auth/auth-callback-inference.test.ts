import { describe, expect, it } from "vitest";
import type { Session } from "@supabase/supabase-js";
import {
  hasValidAuthSession,
  inferAuthFlowFromSession,
  needsOnboardingStep,
  needsPasswordStep,
} from "./auth-callback-inference";

function session(
  over: Partial<Session["user"]> & { metadata?: Record<string, unknown> } = {},
): Session {
  const { metadata, ...userRest } = over;
  return {
    access_token: "tok",
    refresh_token: "ref",
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: "u1",
      aud: "authenticated",
      role: "authenticated",
      email: "a@b.com",
      app_metadata: {},
      user_metadata: metadata ?? {},
      created_at: "2025-01-01T00:00:00Z",
      ...userRest,
    },
  } as Session;
}

describe("auth-callback-inference", () => {
  it("prioriza recovery quando type hint é recovery", () => {
    const s = session({ invited_at: "2025-01-02T00:00:00Z" });
    expect(inferAuthFlowFromSession(s, "recovery")).toBe("recovery");
  });

  it("infere invite quando hash consumido e invited_at sem senha", () => {
    const s = session({ invited_at: "2025-01-02T00:00:00Z" });
    expect(inferAuthFlowFromSession(s, null)).toBe("invite");
  });

  it("infere recovery quando sem invited_at e sem senha", () => {
    const s = session();
    expect(inferAuthFlowFromSession(s, null)).toBe("recovery");
  });

  it("infere invite para onboarding pendente com senha definida", () => {
    const s = session({
      metadata: { lots_bi: { password_set_at: "2025-01-03T00:00:00Z" } },
    });
    expect(inferAuthFlowFromSession(s, null)).toBe("invite");
  });

  it("infere login quando onboarding completo", () => {
    const s = session({
      metadata: {
        lots_bi: {
          password_set_at: "2025-01-03T00:00:00Z",
          onboarding_completed_at: "2025-01-03T00:00:00Z",
        },
      },
    });
    expect(inferAuthFlowFromSession(s, null)).toBe("login");
  });

  it("needsPasswordStep e needsOnboardingStep", () => {
    const noPass = session();
    const passOnly = session({
      metadata: { lots_bi: { password_set_at: "2025-01-03T00:00:00Z" } },
    });
    const complete = session({
      metadata: {
        lots_bi: {
          password_set_at: "2025-01-03T00:00:00Z",
          onboarding_completed_at: "2025-01-03T00:00:00Z",
        },
      },
    });

    expect(needsPasswordStep(noPass)).toBe(true);
    expect(needsOnboardingStep(noPass)).toBe(false);
    expect(needsPasswordStep(passOnly)).toBe(false);
    expect(needsOnboardingStep(passOnly)).toBe(true);
    expect(needsOnboardingStep(complete)).toBe(false);
  });

  it("infere recovery via flow hint quando hash foi consumido", () => {
    const s = session({
      metadata: {
        lots_bi: {
          password_set_at: "2025-01-03T00:00:00Z",
          onboarding_completed_at: "2025-01-03T00:00:00Z",
        },
      },
    });
    expect(inferAuthFlowFromSession(s, null, "recovery")).toBe("recovery");
  });

  it("hasValidAuthSession exige token e user id", () => {
    expect(hasValidAuthSession(null)).toBe(false);
    expect(hasValidAuthSession(session())).toBe(true);
  });
});
