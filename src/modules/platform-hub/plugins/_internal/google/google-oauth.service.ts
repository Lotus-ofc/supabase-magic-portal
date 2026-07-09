import type { ConnectionId } from "../../../../../contracts/connection/connection-id.v1";
import type { CredentialKey } from "../../../../../contracts/credential/credential-vault.v1";
import type { HttpClientPort } from "../http/http-client.port";
import {
  type CredentialAccessPort,
  type OAuthTokenBundleV1,
} from "../oauth/credential-access.port";
import {
  GOOGLE_OAUTH_AUTH_URL,
  GOOGLE_OAUTH_REVOKE_URL,
  GOOGLE_OAUTH_TOKEN_URL,
  GOOGLE_OAUTH_TOKENINFO_URL,
  type GooglePlatformOAuthConfigV1,
} from "./google-oauth.config";

export interface GoogleOAuthAuthorizationParams {
  redirectUri: string;
  state: string;
  scopes?: readonly string[];
}

export interface GoogleOAuthExchangeParams {
  connectionId: ConnectionId;
  code: string;
  redirectUri: string;
}

export interface GoogleTokenValidationV1 {
  valid: boolean;
  expiresAt?: string;
  scopes?: readonly string[];
  error?: string;
}

interface GoogleOAuthTokenResponseV1 {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

interface GoogleTokenInfoResponseV1 {
  expires_in?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

/** OAuth Google compartilhado — Google Ads, GA4, GBP, YouTube. */
export class GoogleOAuthService {
  constructor(
    private readonly config: GooglePlatformOAuthConfigV1,
    private readonly httpClient: HttpClientPort,
    private readonly credentialAccess: CredentialAccessPort,
  ) {}

  buildAuthorizationUrl(params: GoogleOAuthAuthorizationParams): string {
    const scopes = params.scopes ?? this.config.defaultScopes;
    const url = new URL(GOOGLE_OAUTH_AUTH_URL);
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("redirect_uri", params.redirectUri);
    url.searchParams.set("state", params.state);
    url.searchParams.set("scope", scopes.join(" "));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    return url.toString();
  }

  async exchangeCodeForToken(params: GoogleOAuthExchangeParams): Promise<OAuthTokenBundleV1> {
    const response = await this.httpClient.request(GOOGLE_OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: params.redirectUri,
        code: params.code,
        grant_type: "authorization_code",
      }).toString(),
    });

    const body = await response.json<GoogleOAuthTokenResponseV1>();
    const bundle = this.toTokenBundle(body);
    await this.credentialAccess.storeOAuthToken(
      params.connectionId,
      this.config.credentialKey as CredentialKey,
      bundle,
    );
    return bundle;
  }

  async refreshAccessToken(connectionId: ConnectionId): Promise<OAuthTokenBundleV1> {
    const current = await this.credentialAccess.retrieveOAuthToken(
      connectionId,
      this.config.credentialKey as CredentialKey,
    );
    if (!current?.refreshToken) {
      throw new Error("Google refresh requires a refresh token in CredentialVault");
    }

    const response = await this.httpClient.request(GOOGLE_OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: current.refreshToken,
        grant_type: "refresh_token",
      }).toString(),
    });

    const body = await response.json<GoogleOAuthTokenResponseV1>();
    const bundle = this.toTokenBundle(body, current.scopes, current.refreshToken);
    await this.credentialAccess.storeOAuthToken(
      connectionId,
      this.config.credentialKey as CredentialKey,
      bundle,
    );
    return bundle;
  }

  async validateAccessToken(accessToken: string): Promise<GoogleTokenValidationV1> {
    const response = await this.httpClient.request(GOOGLE_OAUTH_TOKENINFO_URL, {
      searchParams: { access_token: accessToken },
    });

    const body = await response.json<GoogleTokenInfoResponseV1>();
    if (body.error) {
      return { valid: false, error: body.error_description ?? body.error };
    }

    const expiresIn = body.expires_in ? Number(body.expires_in) : undefined;
    const expiresAt =
      expiresIn && Number.isFinite(expiresIn)
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : undefined;

    return {
      valid: true,
      expiresAt,
      scopes: body.scope?.split(" ").filter(Boolean),
    };
  }

  async revokeConnectionToken(connectionId: ConnectionId): Promise<void> {
    const current = await this.credentialAccess.retrieveOAuthToken(
      connectionId,
      this.config.credentialKey as CredentialKey,
    );
    if (current?.accessToken) {
      await this.httpClient.request(GOOGLE_OAUTH_REVOKE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: current.accessToken }).toString(),
      });
    }
    await this.credentialAccess.deleteCredential(
      connectionId,
      this.config.credentialKey as CredentialKey,
    );
  }

  private toTokenBundle(
    body: GoogleOAuthTokenResponseV1,
    scopes?: readonly string[],
    refreshToken?: string,
  ): OAuthTokenBundleV1 {
    const expiresAt =
      body.expires_in && body.expires_in > 0
        ? new Date(Date.now() + body.expires_in * 1000).toISOString()
        : undefined;

    const parsedScopes =
      scopes ??
      (body.scope ? (body.scope.split(" ").filter(Boolean) as readonly string[]) : undefined);

    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token ?? refreshToken,
      tokenType: body.token_type ?? "Bearer",
      expiresAt,
      scopes: parsedScopes,
    };
  }
}
