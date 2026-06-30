import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LotsBIWordmark } from "@/components/lotus/LotusMark";
import { BRAND_NAME, BRAND_TAGLINE, brandTitle } from "@/lib/brand";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: brandTitle("Entrar") }] }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center space-y-3 text-center">
          <LotsBIWordmark size="lg" />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
            <p className="text-sm text-muted-foreground">
              {BRAND_NAME} — {BRAND_TAGLINE.toLowerCase()}
            </p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="lotus-focus mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Senha</label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="lotus-focus mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Aguarde…" : "Entrar"}
          </button>
        </form>
        <p className="text-center text-xs text-muted-foreground">
          Acesso mediante convite da equipe {BRAND_NAME}. Em caso de dúvida, fale com seu gestor de
          conta.
        </p>
      </div>
    </div>
  );
}
