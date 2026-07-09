import { describe, expect, it, vi } from "vitest";
import { asConnectionId } from "../../../../../../../contracts/connection/connection-id.v1";
import { CREDENTIAL_VAULT_CONTRACT_VERSION } from "../../../../../../../contracts/credential/credential-vault.v1";
import { createConnectionStack } from "@/modules/platform-hub/connections/create-connection-stack";
import { GA4_OAUTH_CREDENTIAL_KEY } from "../../../ga4/ga4-credential-keys";
import { createRefreshingCredentialAccess } from "../create-refreshing-credential-access";

describe("createRefreshingCredentialAccess", () => {
  it("renova token expirado antes do retrieve", async () => {
    const stack = createConnectionStack();
    const connection = await stack.connectionService.create({
      pluginKey: "ga4",
      label: "GA4 refresh test",
      scopeRef: "cadastro:1" as never,
      activeProviderType: "official_api",
    });

    const expiredAt = new Date(Date.now() - 60_000).toISOString();
    await stack.credentialVault.store(connection.connectionId, GA4_OAUTH_CREDENTIAL_KEY, {
      version: CREDENTIAL_VAULT_CONTRACT_VERSION,
      data: {
        accessToken: "old-token",
        refreshToken: "refresh-123",
        expiresAt: expiredAt,
      },
    });

    const refresh = vi.fn(async () => ({
      accessToken: "new-token",
      refreshToken: "refresh-123",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    }));

    const access = createRefreshingCredentialAccess(stack.credentialVault, {
      credentialKey: GA4_OAUTH_CREDENTIAL_KEY,
      refreshAccessToken: refresh,
    });

    const bundle = await access.retrieveOAuthToken(
      asConnectionId(connection.connectionId),
      GA4_OAUTH_CREDENTIAL_KEY,
    );

    expect(refresh).toHaveBeenCalledOnce();
    expect(bundle?.accessToken).toBe("new-token");
  });

  it("não renova token ainda válido", async () => {
    const stack = createConnectionStack();
    const connection = await stack.connectionService.create({
      pluginKey: "ga4",
      label: "GA4 valid token",
      scopeRef: "cadastro:2" as never,
      activeProviderType: "official_api",
    });

    await stack.credentialVault.store(connection.connectionId, GA4_OAUTH_CREDENTIAL_KEY, {
      version: CREDENTIAL_VAULT_CONTRACT_VERSION,
      data: {
        accessToken: "valid-token",
        refreshToken: "refresh-123",
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      },
    });

    const refresh = vi.fn();
    const access = createRefreshingCredentialAccess(stack.credentialVault, {
      credentialKey: GA4_OAUTH_CREDENTIAL_KEY,
      refreshAccessToken: refresh,
    });

    const bundle = await access.retrieveOAuthToken(
      asConnectionId(connection.connectionId),
      GA4_OAUTH_CREDENTIAL_KEY,
    );

    expect(refresh).not.toHaveBeenCalled();
    expect(bundle?.accessToken).toBe("valid-token");
  });
});
