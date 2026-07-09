export const TIKTOK_OAUTH_DEFAULT_SCOPES = ["ads.read"] as const;

export interface TikTokOAuthConfigV1 {
  appId: string;
  appSecret: string;
  apiVersion?: string;
}

export function tiktokOAuthAuthUrl(): string {
  return "https://business-api.tiktok.com/portal/auth";
}

export function tiktokOAuthTokenUrl(apiVersion: string): string {
  return `https://business-api.tiktok.com/open_api/${apiVersion}/oauth2/access_token/`;
}

export function tiktokOAuthRefreshUrl(apiVersion: string): string {
  return `https://business-api.tiktok.com/open_api/${apiVersion}/oauth2/refresh_token/`;
}
