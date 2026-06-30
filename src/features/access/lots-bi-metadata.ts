import type { LotsBiUserMetadata } from "./types";

export function parseLotsBiMetadata(
  userMetadata: Record<string, unknown> | undefined | null,
): LotsBiUserMetadata {
  if (!userMetadata || typeof userMetadata !== "object") return {};
  const raw = userMetadata.lots_bi;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const result: LotsBiUserMetadata = {};
  if (typeof obj.password_set_at === "string") result.password_set_at = obj.password_set_at;
  if (typeof obj.onboarding_completed_at === "string") {
    result.onboarding_completed_at = obj.onboarding_completed_at;
  }
  return result;
}

export function buildLotsBiMetadataPatch(
  patch: Partial<LotsBiUserMetadata>,
  existing?: Record<string, unknown> | null,
): Record<string, unknown> {
  const current = parseLotsBiMetadata(existing ?? undefined);
  return {
    ...(existing ?? {}),
    lots_bi: {
      ...current,
      ...patch,
    },
  };
}

export function isOnboardingComplete(metadata: LotsBiUserMetadata): boolean {
  return Boolean(metadata.onboarding_completed_at && metadata.password_set_at);
}

export function isPasswordSet(metadata: LotsBiUserMetadata): boolean {
  return Boolean(metadata.password_set_at);
}
