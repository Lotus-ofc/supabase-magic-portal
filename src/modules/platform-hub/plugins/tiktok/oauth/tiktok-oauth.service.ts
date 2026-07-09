import type { ConnectionId } from "../../../../../../contracts/connection/connection-id.v1";
import type { HttpClientPort } from "../../_internal/http/http-client.port";
import {
  type CredentialAccessPort,
  type OAuthTokenBundleV1,
} from "../../_internal/oauth/credential-access.port";
import type { TikTokOAuthTokenResponseV1 } from "../api/tiktok-api.types";
import { TIKTOK_OAUTH_CREDENTIAL_KEY } from "../tiktok-credential-keys";
import {
  type TikTokOAuthConfigV1,
  TIKTOK_OAUTH_DEFAULT_SCOPES,
  tiktokOAuthAuthUrl,
  tiktokOAuthRefreshUrl,
  tiktokOAuthTokenUrl,
} from "./tiktok-oauth.config";

export interface TikTokOAuthAuthorizationParams {
  redirectUri: string;
  state: string;
  scopes?: readonly string[];
}

export interface TikTokOAuthExchangeParams {
  connectionId: ConnectionId;
  code: string;
  redirectUri: string;
}

export interface TikTokTokenValidationV1 {
  valid: boolean;
  expiresAt?: string;
  scopes?: readonly string[];
  error?: string;
}

/** OAuth TikTok desacoplado do Runtime — tokens persistidos no CredentialVault. */
export class TikTokOAuthService {
  private readonly apiVersion: string;

  constructor(
    private readonly config: TikTokOAuthConfigV1,
    private readonly httpClient: HttpClientPort,
    private readonly credentialAccess: CredentialAccessPort,
  ) {
    this.apiVersion = config.apiVersion ?? "v1.3";
  }

  buildAuthorizationUrl(params: TikTokOAuthAuthorizationParams): string {
    const scopes = params.scopes ?? TIKTOK_OAUTH_DEFAULT_SCOPES;
    const url = new URL(tiktokOAuthAuthUrl());
    url.searchParams.set("app_id", this.config.appId);
    url.searchParams.set("redirect_uri", params.redirectUri);
    url.searchParams.set("state", params.state);
    url.searchParams.set("scope", scopes.join(","));
    return url.toString();
  }

  async exchangeCodeForToken(params: TikTokOAuthExchangeParams): Promise<OAuthTokenBundleV1> {
    const response = await this.httpClient.request(tiktokOAuthTokenUrl(this.apiVersion), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: this.config.appId,
        secret: this.config.appSecret,
        auth_code: params.code,
        redirect_uri: params.redirectUri,
      }),
    });

    const body = await response.json<TikTokOAuthTokenResponseV1>();
    const bundle = this.toTokenBundle(body);
    if (!bundle.accessToken) {
      throw new Error("TikTok OAuth não retornou access_token");
    }
    await this.credentialAccess.storeOAuthToken(
      params.connectionId,
      TIKTOK_OAUTH_CREDENTIAL_KEY,
      bundle,
    );
    return bundle;
  }

  async refreshAccessToken(connectionId: ConnectionId): Promise<OAuthTokenBundleV1> {
    const current = await this.credentialAccess.retrieveOAuthToken(
      connectionId,
      TIKTOK_OAUTH_CREDENTIAL_KEY,
    );
    if (!current?.refreshToken) {
      throw new Error("TikTok refresh requires a refresh token in CredentialVault");
    }

    const response = await this.httpClient.request(tiktokOAuthRefreshUrl(this.apiVersion), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: this.config.appId,
        secret: this.config.appSecret,
        refresh_token: current.refreshToken,
      }),
    });

    const body = await response.json<TikTokOAuthTokenResponseV1>();
    const bundle = this.toTokenBundle(body, current.scopes);
    await this.credentialAccess.storeOAuthToken(connectionId, TIKTOK_OAUTH_CREDENTIAL_KEY, bundle);
    return bundle;
  }

  async validateAccessToken(accessToken: string): Promise<TikTokTokenValidationV1> {
    const response = await this.httpClient.request(
      `https://business-api.tiktok.com/open_api/${this.apiVersion}/oauth2/advertiser/get/`,
      {
        method: "GET",
        headers: { "Access-Token": accessToken },
      },
    );

    const body = await response.json<{ code?: number; message?: string }>();
    return {
      valid: body.code === 0,
      error: body.code === 0 ? undefined : body.message,
    };
  }

  async revokeConnectionToken(connectionId: ConnectionId): Promise<void> {
    await this.credentialAccess.deleteCredential(connectionId, TIKTOK_OAUTH_CREDENTIAL_KEY);
  }

  private toTokenBundle(
    body: TikTokOAuthTokenResponseV1,
    scopes?: readonly string[],
  ): OAuthTokenBundleV1 {
    const data = body.data;
    const expiresAt =
      data?.expires_in && data.expires_in > 0
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

    return {
      accessToken: data?.access_token ?? "",
      refreshToken: data?.refresh_token,
      tokenType: "Bearer",
      expiresAt,
      scopes,
    };
  }
}
