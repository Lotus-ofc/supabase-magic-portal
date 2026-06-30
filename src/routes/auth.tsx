import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LotsBIWordmark } from "@/components/lotus/LotusMark";
import { BRAND_NAME, BRAND_TAGLINE, brandTitle } from "@/lib/brand";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: brandTitle("Entrar") }] }),
  component: AuthPage,
});

type AuthMode = "signin" | "invite" | "recovery";
type AuthPhase = "bootstrapping" | "ready";

/** Marca fluxo de convite iniciado via detectSessionInUrl (SIGNED_IN). */
const INVITE_FLOW_SESSION_KEY = "lots-auth-invite-flow";

function readAuthTypeFromUrl(): AuthMode {
  if (typeof window === "undefined") return "signin";
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const type = hash.get("type") ?? query.get("type");
  if (type === "invite") return "invite";
  if (type === "recovery") return "recovery";
  return "signin";
}

function markInviteFlowActive(): void {
  try {
    sessionStorage.setItem(INVITE_FLOW_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

function clearInviteFlowMarker(): void {
  try {
    sessionStorage.removeItem(INVITE_FLOW_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

function isInviteFlowActive(): boolean {
  try {
    return sessionStorage.getItem(INVITE_FLOW_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function AuthPage() {
  const router = useRouter();
  const signingInRef = useRef(false);
  const [phase, setPhase] = useState<AuthPhase>("bootstrapping");
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("recovery");
        return;
      }
      if (event === "SIGNED_IN" && !signingInRef.current) {
        markInviteFlowActive();
        setMode("invite");
      }
    });

    async function bootstrapAuthUi() {
      const urlMode = readAuthTypeFromUrl();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (urlMode === "recovery") {
        setMode("recovery");
        setPhase("ready");
        return;
      }

      if (urlMode === "invite") {
        markInviteFlowActive();
        setMode("invite");
        setPhase("ready");
        return;
      }

      if (session?.user) {
        if (isInviteFlowActive() || session.user.invited_at) {
          setMode("invite");
          setPhase("ready");
          return;
        }

        router.navigate({ to: "/dashboard" });
        return;
      }

      setMode("signin");
      setPhase("ready");
    }

    void bootstrapAuthUi();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  const clearAuthFragment = () => {
    if (typeof window === "undefined") return;
    window.history.replaceState(null, "", window.location.pathname);
  };

  const submitSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    signingInRef.current = true;
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      signingInRef.current = false;
      setLoading(false);
    }
  };

  const submitSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      clearInviteFlowMarker();
      clearAuthFragment();
      router.navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  };

  const isSetPassword = mode === "invite" || mode === "recovery";

  if (phase === "bootstrapping") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="space-y-3 text-center">
          <LotsBIWordmark size="lg" className="mx-auto" />
          <p className="text-sm text-muted-foreground">Preparando acesso…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center space-y-3 text-center">
          <LotsBIWordmark size="lg" />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {isSetPassword ? "Definir senha" : "Entrar"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSetPassword
                ? mode === "invite"
                  ? "Bem-vindo(a)! Crie sua senha para acessar o portal."
                  : "Escolha uma nova senha para continuar."
                : `${BRAND_NAME} — ${BRAND_TAGLINE.toLowerCase()}`}
            </p>
          </div>
        </div>

        {isSetPassword ? (
          <form onSubmit={submitSetPassword} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nova senha</label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="lotus-focus mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Confirmar senha</label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="lotus-focus mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Aguarde…" : "Salvar senha e entrar"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitSignIn} className="space-y-4">
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
        )}

        <p className="text-center text-xs text-muted-foreground">
          Acesso mediante convite da equipe {BRAND_NAME}. Em caso de dúvida, fale com seu gestor de
          conta.
        </p>
      </div>
    </div>
  );
}
