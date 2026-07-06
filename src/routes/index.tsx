import { createFileRoute, redirect } from "@tanstack/react-router";
import { bootstrapSupabase, supabase } from "@/integrations/supabase/client";
import { brandTitle } from "@/lib/brand";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: [{ title: brandTitle("Portal") }] }),
  beforeLoad: async () => {
    await bootstrapSupabase();
    const { data } = await supabase.auth.getUser();
    throw redirect({ to: data.user ? "/dashboard" : "/auth" });
  },
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Carregando…</p>
    </div>
  ),
  component: () => null,
});
