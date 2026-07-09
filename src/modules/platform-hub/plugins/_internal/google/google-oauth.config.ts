export const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_OAUTH_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
export const GOOGLE_OAUTH_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";

export interface GoogleOAuthConfigV1 {
  clientId: string;
  clientSecret: string;
}

export interface GooglePlatformOAuthConfigV1 extends GoogleOAuthConfigV1 {
  credentialKey: string;
  defaultScopes: readonly string[];
}
