import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AuthBootstrapping,
  AuthShell,
  authCallbackSearchSchema,
  completeAuthCallback,
  parseAuthCallbackParams,
  resolvePostCallbackRedirect,
} from "@/features/auth";
import { markInviteAccepted } from "@/lib/access.functions.server";
import { brandTitle } from "@/lib/brand";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  validateSearch: authCallbackSearchSchema,
  head: () => ({ meta: [{ title: brandTitle("Autenticando") }] }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const router = useRouter();
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

      if (result.flow === "invite" || result.flow === "signup") {
        try {
          await markInviteAccepted();
        } catch {
          /* idempotente — lifecycle pode já estar atualizado */
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
  }, [router]);

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
