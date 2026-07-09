import type { ConnectionId } from "../../../../../../contracts/connection/connection-id.v1";
import type { HttpClientPort } from "../../_internal/http/http-client.port";
import type {
  CredentialAccessPort,
  OAuthTokenBundleV1,
} from "../../_internal/oauth/credential-access.port";
import { GoogleOAuthService } from "../../_internal/google/google-oauth.service";
import type { GoogleOAuthConfigV1 } from "../../_internal/google/google-oauth.config";
import { GA4_OAUTH_CREDENTIAL_KEY } from "../ga4-credential-keys";
import { GA4_OAUTH_DEFAULT_SCOPES } from "./ga4-oauth.config";

export type Ga4OAuthAuthorizationParams = Parameters<
  GoogleOAuthService["buildAuthorizationUrl"]
>[0];
export type Ga4OAuthExchangeParams = Parameters<GoogleOAuthService["exchangeCodeForToken"]>[0];

/** OAuth GA4 — delega ao GoogleOAuthService compartilhado. */
export class Ga4OAuthService {
  private readonly delegate: GoogleOAuthService;

  constructor(
    config: GoogleOAuthConfigV1,
    httpClient: HttpClientPort,
    credentialAccess: CredentialAccessPort,
  ) {
    this.delegate = new GoogleOAuthService(
      {
        ...config,
        credentialKey: GA4_OAUTH_CREDENTIAL_KEY,
        defaultScopes: GA4_OAUTH_DEFAULT_SCOPES,
      },
      httpClient,
      credentialAccess,
    );
  }

  buildAuthorizationUrl(params: Ga4OAuthAuthorizationParams): string {
    return this.delegate.buildAuthorizationUrl(params);
  }

  exchangeCodeForToken(params: Ga4OAuthExchangeParams): Promise<OAuthTokenBundleV1> {
    return this.delegate.exchangeCodeForToken(params);
  }

  refreshAccessToken(connectionId: ConnectionId): Promise<OAuthTokenBundleV1> {
    return this.delegate.refreshAccessToken(connectionId);
  }

  validateAccessToken(accessToken: string) {
    return this.delegate.validateAccessToken(accessToken);
  }

  revokeConnectionToken(connectionId: ConnectionId): Promise<void> {
    return this.delegate.revokeConnectionToken(connectionId);
  }
}
