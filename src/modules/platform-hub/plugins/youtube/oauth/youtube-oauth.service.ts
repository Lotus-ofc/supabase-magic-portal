import type { ConnectionId } from "../../../../../../contracts/connection/connection-id.v1";
import type { HttpClientPort } from "../../_internal/http/http-client.port";
import type {
  CredentialAccessPort,
  OAuthTokenBundleV1,
} from "../../_internal/oauth/credential-access.port";
import { GoogleOAuthService } from "../../_internal/google/google-oauth.service";
import type { GoogleOAuthConfigV1 } from "../../_internal/google/google-oauth.config";
import { YOUTUBE_OAUTH_CREDENTIAL_KEY } from "../youtube-credential-keys";
import { YOUTUBE_OAUTH_DEFAULT_SCOPES } from "./youtube-oauth.config";

/** OAuth YouTube — delega ao GoogleOAuthService compartilhado. */
export class YouTubeOAuthService {
  private readonly delegate: GoogleOAuthService;

  constructor(
    config: GoogleOAuthConfigV1,
    httpClient: HttpClientPort,
    credentialAccess: CredentialAccessPort,
  ) {
    this.delegate = new GoogleOAuthService(
      {
        ...config,
        credentialKey: YOUTUBE_OAUTH_CREDENTIAL_KEY,
        defaultScopes: YOUTUBE_OAUTH_DEFAULT_SCOPES,
      },
      httpClient,
      credentialAccess,
    );
  }

  buildAuthorizationUrl(
    params: Parameters<GoogleOAuthService["buildAuthorizationUrl"]>[0],
  ): string {
    return this.delegate.buildAuthorizationUrl(params);
  }

  exchangeCodeForToken(
    params: Parameters<GoogleOAuthService["exchangeCodeForToken"]>[0],
  ): Promise<OAuthTokenBundleV1> {
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
