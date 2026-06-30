import { describe, expect, it } from "vitest";
import { assembleUserAccessProfile } from "./access-profile";
import type { AccessAccountRow, AuthUserSnapshot } from "./types";

describe("assembleUserAccessProfile", () => {
  it("monta profile com fontes Supabase + lifecycle", () => {
    const authUser: AuthUserSnapshot = {
      id: "u1",
      email: "user@test.com",
      created_at: "2025-01-01T00:00:00Z",
      last_sign_in_at: "2025-01-05T00:00:00Z",
      invited_at: "2025-01-02T00:00:00Z",
      confirmation_sent_at: "2025-01-02T01:00:00Z",
      email_confirmed_at: "2025-01-02T01:00:00Z",
      banned_until: null,
      user_metadata: {
        lots_bi: {
          password_set_at: "2025-01-03T00:00:00Z",
          onboarding_completed_at: "2025-01-03T00:00:00Z",
        },
      },
    };
    const accessAccount: AccessAccountRow = {
      user_id: "u1",
      lifecycle_status: "active",
      blocked_reason: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-03T00:00:00Z",
    };

    const profile = assembleUserAccessProfile({
      authUser,
      accessAccount,
      roles: ["cliente"],
      clientes: ["Cliente A"],
      nome: "User Test",
      auditRows: [
        {
          id: "a1",
          user_id: "u1",
          actor_id: null,
          action: "invite_resent",
          detail: null,
          metadata: {},
          created_at: "2025-01-02T12:00:00Z",
        },
      ],
    });

    expect(profile.email).toBe("user@test.com");
    expect(profile.invite_sent_at).toBe("2025-01-02T01:00:00Z");
    expect(profile.invite_last_resent_at).toBe("2025-01-02T12:00:00Z");
    expect(profile.can_access_platform).toBe(true);
    expect(profile.clientes).toEqual(["Cliente A"]);
  });
});
