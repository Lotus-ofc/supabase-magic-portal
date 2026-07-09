import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { completeHubGoogleOAuth } from "@/modules/platform-hub-admin/hub-admin.server";
import { navigateOAuthRedirect } from "@/components/lotus/platform-hub/oauth-redirect";

const searchSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export const Route = createFileRoute("/oauth/google/callback")({
  validateSearch: searchSchema,
  component: GoogleOAuthCallbackPage,
});

function GoogleOAuthCallbackPage() {
  const search = Route.useSearch();
  const [message, setMessage] = useState("Processando autenticação Google...");

  useEffect(() => {
    if (search.error) {
      setMessage(search.error_description ?? search.error);
      return;
    }
    if (!search.code || !search.state) {
      setMessage("Parâmetros OAuth ausentes.");
      return;
    }
    void completeHubGoogleOAuth({ data: { code: search.code, state: search.state } })
      .then((result) => {
        navigateOAuthRedirect(result.redirectAfter);
      })
      .catch((e) => {
        setMessage(e instanceof Error ? e.message : "Falha no OAuth");
      });
  }, [search]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <p className="text-center text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
