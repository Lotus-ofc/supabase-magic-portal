import { describe, expect, it } from "vitest";
import {
  isHubOAuthPlugin,
  oauthCallbackKind,
  oauthCredentialKeyForPlugin,
} from "@/modules/platform-hub-admin/services/hub-oauth.factory";

describe("hub-oauth.factory", () => {
  it("reconhece plugins OAuth oficiais", () => {
    for (const key of ["meta_ads", "google_ads", "ga4", "google_business", "tiktok", "youtube"]) {
      expect(isHubOAuthPlugin(key)).toBe(true);
      expect(oauthCredentialKeyForPlugin(key)).toBeTruthy();
    }
  });

  it("mapeia callbacks por família OAuth", () => {
    expect(oauthCallbackKind("meta_ads")).toBe("meta");
    expect(oauthCallbackKind("ga4")).toBe("google");
    expect(oauthCallbackKind("youtube")).toBe("google");
    expect(oauthCallbackKind("tiktok")).toBe("tiktok");
    expect(oauthCallbackKind("example")).toBeNull();
  });
});
