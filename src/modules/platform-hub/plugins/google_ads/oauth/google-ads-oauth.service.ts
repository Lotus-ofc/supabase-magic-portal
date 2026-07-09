import type { ConnectionId } from "../../../../../../contracts/connection/connection-id.v1";
import type { HttpClientPort } from "../../_internal/http/http-client.port";
import type {
  CredentialAccessPort,
  OAuthTokenBundleV1,
} from "../../_internal/oauth/credential-access.port";
import { GoogleOAuthService } from "../../_internal/google/google-oauth.service";
import type { GoogleOAuthConfigV1 } from "../../_internal/google/google-oauth.config";
import { GOOGLE_ADS_OAUTH_CREDENTIAL_KEY } from "../google-ads-credential-keys";
import { GOOGLE_ADS_OAUTH_DEFAULT_SCOPES } from "./google-ads-oauth.config";

export type GoogleAdsOAuthAuthorizationParams = Parameters<
  GoogleOAuthService["buildAuthorizationUrl"]
>[0];
export type GoogleAdsOAuthExchangeParams = Parameters<
  GoogleOAuthService["exchangeCodeForToken"]
>[0];
export type GoogleAdsTokenValidationV1 = Awaited<
  ReturnType<GoogleOAuthService["validateAccessToken"]>
>;

/** OAuth Google Ads — delega ao GoogleOAuthService compartilhado. */
export class GoogleAdsOAuthService {
  private readonly delegate: GoogleOAuthService;

  constructor(
    config: GoogleOAuthConfigV1,
    httpClient: HttpClientPort,
    credentialAccess: CredentialAccessPort,
  ) {
    this.delegate = new GoogleOAuthService(
      {
        ...config,
        credentialKey: GOOGLE_ADS_OAUTH_CREDENTIAL_KEY,
        defaultScopes: GOOGLE_ADS_OAUTH_DEFAULT_SCOPES,
      },
      httpClient,
      credentialAccess,
    );
  }

  buildAuthorizationUrl(params: GoogleAdsOAuthAuthorizationParams): string {
    return this.delegate.buildAuthorizationUrl(params);
  }

  exchangeCodeForToken(params: GoogleAdsOAuthExchangeParams): Promise<OAuthTokenBundleV1> {
    return this.delegate.exchangeCodeForToken(params);
  }

  refreshAccessToken(connectionId: ConnectionId): Promise<OAuthTokenBundleV1> {
    return this.delegate.refreshAccessToken(connectionId);
  }

  validateAccessToken(accessToken: string): Promise<GoogleAdsTokenValidationV1> {
    return this.delegate.validateAccessToken(accessToken);
  }

  revokeConnectionToken(connectionId: ConnectionId): Promise<void> {
    return this.delegate.revokeConnectionToken(connectionId);
  }
}
