import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AuthBootstrapping,
  AuthShell,
  authCallbackSearchSchema,
  completeAuthCallback,
  parseAuthCallbackParams,
  resolvePostCallbackRedirect,
} from "@/modules/auth";
import { postAuthOnCallbackCompleted } from "@/modules/access/post-auth-orchestrator.server";
import { brandTitle } from "@/lib/brand";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  validateSearch: authCallbackSearchSchema,
  head: () => ({ meta: [{ title: brandTitle("Autenticando") }] }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const router = useRouter();
  const callbackCompletedFn = useServerFn(postAuthOnCallbackCompleted);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const search = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const params = parseAuthCallbackParams(search, hash);

      const result = await completeAuthCallback(supabase, params);
      if (cancelled) return;

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      if (result.flow === "invite") {
        try {
          await callbackCompletedFn({ data: { flow: "invite" } });
        } catch {
          /* idempotente */
        }
      }

      const redirect = resolvePostCallbackRedirect(result.flow);
      router.navigate({
        to: "/auth",
        search: {
          view: redirect.view,
          ...(redirect.context ? { context: redirect.context } : {}),
        },
        replace: true,
      });
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [router, callbackCompletedFn]);

  if (message) {
    return (
      <AuthShell title="Falha na autenticação" subtitle="Não foi possível validar o link.">
        <p className="text-center text-sm text-destructive">{message}</p>
        <button
          type="button"
          onClick={() => router.navigate({ to: "/auth", search: { view: "login" } })}
          className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Voltar ao login
        </button>
      </AuthShell>
    );
  }

  return <AuthBootstrapping />;
}
