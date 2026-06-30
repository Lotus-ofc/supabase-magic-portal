import type { Session } from "@supabase/supabase-js";
import {
  isOnboardingComplete,
  isPasswordSet,
  parseLotsBiMetadata,
} from "@/features/access/lots-bi-metadata";
import type { AuthCallbackType } from "./auth-callback";

export type InferredAuthFlow = AuthCallbackType | "login";

/** Inferência de fluxo — não depende exclusivamente de `type` na URL (hash pode ser limpo pelo SDK). */
export function inferAuthFlowFromSession(
  session: Session,
  urlTypeHint: AuthCallbackType | null,
  flowHint: string | null = null,
): InferredAuthFlow {
  if (urlTypeHint === "recovery" || flowHint === "recovery") return "recovery";
  if (urlTypeHint === "invite" || urlTypeHint === "signup") return urlTypeHint;

  const lotsBi = parseLotsBiMetadata(session.user.user_metadata);

  if (urlTypeHint === "magiclink" || urlTypeHint === "email") {
    return isPasswordSet(lotsBi) && isOnboardingComplete(lotsBi) ? "login" : "invite";
  }

  if (session.user.invited_at && !isPasswordSet(lotsBi)) {
    return "invite";
  }

  if (!isPasswordSet(lotsBi)) {
    return "recovery";
  }

  if (isPasswordSet(lotsBi) && !isOnboardingComplete(lotsBi)) {
    return "invite";
  }

  return "login";
}

export function needsPasswordStep(session: Session): boolean {
  return !isPasswordSet(parseLotsBiMetadata(session.user.user_metadata));
}

export function needsOnboardingStep(session: Session): boolean {
  const lotsBi = parseLotsBiMetadata(session.user.user_metadata);
  return isPasswordSet(lotsBi) && !isOnboardingComplete(lotsBi);
}

export function hasValidAuthSession(session: Session | null | undefined): session is Session {
  return Boolean(session?.access_token && session.user?.id);
}
