import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  AuthPage,
  authSearchSchema,
  hasLegacyAuthTokensOnAuthRoute,
  type AuthPageOrchestrator,
} from "@/modules/auth";
import {
  postAuthOnInvitePasswordSet,
  postAuthOnLoginSuccess,
  postAuthOnRecoveryCompleted,
} from "@/modules/access/post-auth-orchestrator.server";
import { brandTitle } from "@/lib/brand";

export const Route = createFileRoute("/auth/")({
  ssr: false,
  validateSearch: authSearchSchema,
  beforeLoad: ({ search }) => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (hasLegacyAuthTokensOnAuthRoute(params)) {
      throw redirect({
        to: "/auth/callback",
        search: {
          token_hash: params.get("token_hash") ?? undefined,
          type: params.get("type") ?? undefined,
          code: params.get("code") ?? undefined,
          error: params.get("error") ?? undefined,
          error_description: params.get("error_description") ?? undefined,
        },
      });
    }
    void search;
  },
  head: () => ({ meta: [{ title: brandTitle("Entrar") }] }),
  component: AuthRoutePage,
});

function AuthRoutePage() {
  const router = useRouter();
  const search = Route.useSearch();
  const loginSuccessFn = useServerFn(postAuthOnLoginSuccess);
  const invitePasswordSetFn = useServerFn(postAuthOnInvitePasswordSet);
  const recoveryCompletedFn = useServerFn(postAuthOnRecoveryCompleted);

  const orchestrator: AuthPageOrchestrator = {
    onLoginSuccess: async (redirectTo) => {
      const result = await loginSuccessFn({ data: { redirect: redirectTo ?? undefined } });
      if (!result.ok) {
        if (result.blocked.signOut) {
          await supabase.auth.signOut();
        }
        router.navigate({ to: result.blocked.to, search: result.blocked.search, replace: true });
        return;
      }
      router.navigate({ to: result.path, replace: true });
    },
    onInvitePasswordSet: () => invitePasswordSetFn(),
    onRecoveryCompleted: () => recoveryCompletedFn(),
  };

  return <AuthPage search={search} orchestrator={orchestrator} />;
}
