import type { ConnectionId } from "../../../../../../contracts/connection/connection-id.v1";
import type { CredentialKey } from "../../../../../../contracts/credential/credential-vault.v1";
import type { CredentialVaultPortV1 } from "../../../../../../contracts/credential/credential-vault.v1";
import {
  createCredentialAccess,
  type CredentialAccessPort,
  type OAuthTokenBundleV1,
  parseOAuthTokenBundle,
} from "./credential-access.port";

const DEFAULT_REFRESH_SKEW_MS = 5 * 60_000;

function isExpiredOrExpiring(expiresAt: string | undefined, skewMs: number): boolean {
  if (!expiresAt) return false;
  const expiresMs = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiresMs)) return false;
  return expiresMs - skewMs <= Date.now();
}

export interface RefreshingCredentialAccessOptions {
  credentialKey: CredentialKey;
  refreshAccessToken: (connectionId: ConnectionId) => Promise<OAuthTokenBundleV1>;
  refreshSkewMs?: number;
}

/** Renova token OAuth antes do collect quando expirado — camada provider, sem alterar Runtime. */
export function createRefreshingCredentialAccess(
  vault: CredentialVaultPortV1,
  options: RefreshingCredentialAccessOptions,
): CredentialAccessPort {
  const base = createCredentialAccess(vault);
  const skewMs = options.refreshSkewMs ?? DEFAULT_REFRESH_SKEW_MS;

  return {
    async retrieveOAuthToken(connectionId, key) {
      const bundle = await base.retrieveOAuthToken(connectionId, key);
      if (!bundle || key !== options.credentialKey) return bundle;
      if (!bundle.refreshToken || !isExpiredOrExpiring(bundle.expiresAt, skewMs)) {
        return bundle;
      }
      try {
        return await options.refreshAccessToken(connectionId);
      } catch {
        return bundle;
      }
    },
    storeOAuthToken: base.storeOAuthToken,
    deleteCredential: base.deleteCredential,
  };
}

export function peekOAuthTokenExpiry(
  vault: CredentialVaultPortV1,
  connectionId: ConnectionId,
  key: CredentialKey,
): Promise<string | undefined> {
  return vault.retrieve(connectionId, key).then((p) => parseOAuthTokenBundle(p)?.expiresAt);
}
