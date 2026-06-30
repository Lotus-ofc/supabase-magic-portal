import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildLotsBiMetadataPatch,
  isOnboardingComplete,
  parseLotsBiMetadata,
} from "@/features/access/lots-bi-metadata";
import {
  AuthBootstrapping,
  AuthShell,
  authSearchSchema,
  hasLegacyAuthTokensOnAuthRoute,
  isOnboardingView,
  isSetPasswordView,
  needsOnboardingStep,
  needsPasswordStep,
  resolveAuthView,
  resolvePostAuthPath,
  type SetPasswordContext,
} from "@/features/auth";
import {
  markFirstAccessCompleted,
  markPasswordRecoveryCompleted,
  markPasswordSet,
} from "@/lib/access.functions.server";
import { checkIsAdmin } from "@/lib/admin.functions";
import { buildAuthRecoveryCallbackUrl } from "@/lib/app-url";
import { BRAND_NAME, BRAND_TAGLINE, brandTitle } from "@/lib/brand";
import { isPlatformOwnerEmail } from "@/lib/platform-owner";

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
  component: AuthPage,
});

type AuthPhase = "bootstrapping" | "ready";

function AuthPage() {
  const router = useRouter();
  const search = Route.useSearch();
  const view = resolveAuthView(search);
  const signingInRef = useRef(false);
  const [phase, setPhase] = useState<AuthPhase>("bootstrapping");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(search.error ?? null);
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        router.navigate({
          to: "/auth",
          search: { view: "set-password", context: "recovery" },
          replace: true,
        });
      }
    });

    async function bootstrap() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (isSetPasswordView(view)) {
        if (!session?.user) {
          router.navigate({
            to: "/auth",
            search: { view: "link-error", error: "Sessão expirada. Solicite um novo link." },
            replace: true,
          });
          return;
        }
        if (!needsPasswordStep(session)) {
          router.navigate({
            to: "/auth",
            search: { view: needsOnboardingStep(session) ? "onboarding" : "login" },
            replace: true,
          });
          return;
        }
        setPhase("ready");
        return;
      }

      if (isOnboardingView(view)) {
        if (!session?.user) {
          router.navigate({
            to: "/auth",
            search: { view: "link-error", error: "Sessão expirada. Solicite um novo link." },
            replace: true,
          });
          return;
        }
        if (needsPasswordStep(session)) {
          router.navigate({
            to: "/auth",
            search: { view: "set-password", context: "invite" },
            replace: true,
          });
          return;
        }
        if (!needsOnboardingStep(session)) {
          router.navigate({ to: "/dashboard" });
          return;
        }
        setPhase("ready");
        return;
      }

      if (view === "link-error") {
        setPhase("ready");
        return;
      }

      if (session?.user && view === "login") {
        if (needsPasswordStep(session)) {
          router.navigate({
            to: "/auth",
            search: { view: "set-password", context: "invite" },
            replace: true,
          });
          return;
        }
        if (needsOnboardingStep(session)) {
          router.navigate({ to: "/auth", search: { view: "onboarding" }, replace: true });
          return;
        }

        const isOwner = isPlatformOwnerEmail(session.user.email);
        let isAdmin = isOwner;
        if (!isOwner) {
          try {
            const result = await checkIsAdmin();
            isAdmin = !!result?.isAdmin;
          } catch {
            isAdmin = false;
          }
        }
        router.navigate({ to: resolvePostAuthPath(isAdmin, search.redirect) });
        return;
      }

      setPhase("ready");
    }

    void bootstrap();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router, search.redirect, view]);

  const clearAuthFragment = () => {
    if (typeof window === "undefined") return;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  };

  const submitSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    signingInRef.current = true;
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      const isOwner = isPlatformOwnerEmail(email);
      let isAdmin = isOwner;
      if (!isOwner) {
        const result = await checkIsAdmin();
        isAdmin = !!result?.isAdmin;
      }
      router.navigate({ to: resolvePostAuthPath(isAdmin, search.redirect) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      signingInRef.current = false;
      setLoading(false);
    }
  };

  const submitForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const appOrigin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = buildAuthRecoveryCallbackUrl(appOrigin);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (resetError) throw resetError;
      setForgotSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Sessão expirada. Solicite um novo link.");

      const context: SetPasswordContext = search.context ?? "invite";
      const now = new Date().toISOString();
      const user = session.user;
      const lotsBi = parseLotsBiMetadata(user.user_metadata);

      if (context === "recovery") {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;

        await markPasswordRecoveryCompleted();
        clearAuthFragment();
        await supabase.auth.signOut();

        if (isOnboardingComplete(lotsBi)) {
          router.navigate({ to: "/auth", search: { view: "login" }, replace: true });
        } else {
          router.navigate({ to: "/auth", search: { view: "onboarding" }, replace: true });
        }
        return;
      }

      const metadataPatch = buildLotsBiMetadataPatch({ password_set_at: now }, user.user_metadata);
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: metadataPatch,
      });
      if (updateError) throw updateError;

      await markPasswordSet();
      clearAuthFragment();
      router.navigate({ to: "/auth", search: { view: "onboarding" }, replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  };

  const submitOnboarding = async () => {
    setError(null);
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada. Solicite um novo link.");

      const lotsBi = parseLotsBiMetadata(user.user_metadata);
      if (!lotsBi.password_set_at) {
        router.navigate({
          to: "/auth",
          search: { view: "set-password", context: "invite" },
          replace: true,
        });
        return;
      }

      const now = new Date().toISOString();
      const metadataPatch = buildLotsBiMetadataPatch(
        { onboarding_completed_at: now },
        user.user_metadata,
      );
      const { error: updateError } = await supabase.auth.updateUser({ data: metadataPatch });
      if (updateError) throw updateError;

      await markFirstAccessCompleted();

      const isOwner = isPlatformOwnerEmail(user.email);
      let isAdmin = isOwner;
      if (!isOwner) {
        const result = await checkIsAdmin();
        isAdmin = !!result?.isAdmin;
      }
      router.navigate({ to: resolvePostAuthPath(isAdmin, search.redirect) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  };

  if (phase === "bootstrapping") {
    return <AuthBootstrapping />;
  }

  if (view === "link-error") {
    return (
      <AuthShell
        title="Link inválido"
        subtitle="Não foi possível concluir a autenticação com este link."
      >
        <p className="text-center text-sm text-destructive">
          {error ?? "O link pode ter expirado ou já foi utilizado."}
        </p>
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

  if (view === "forgot-password") {
    return (
      <AuthShell title="Recuperar senha" subtitle="Enviaremos um link para redefinir sua senha.">
        {forgotSent ? (
          <p className="text-center text-sm text-muted-foreground">
            Se o e-mail existir em nossa base, você receberá instruções em breve.
          </p>
        ) : (
          <form onSubmit={submitForgotPassword} className="space-y-4">
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Aguarde…" : "Enviar link"}
            </button>
          </form>
        )}
        <button
          type="button"
          onClick={() => router.navigate({ to: "/auth", search: { view: "login" } })}
          className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          Voltar ao login
        </button>
      </AuthShell>
    );
  }

  if (isOnboardingView(view)) {
    return (
      <AuthShell
        title="Concluir primeiro acesso"
        subtitle="Confirme para finalizar a configuração da sua conta."
      >
        <p className="text-center text-sm text-muted-foreground">
          Sua senha foi definida. Clique abaixo para concluir o onboarding e acessar o portal.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="button"
          disabled={loading}
          onClick={() => void submitOnboarding()}
          className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Aguarde…" : "Concluir e entrar"}
        </button>
      </AuthShell>
    );
  }

  if (isSetPasswordView(view)) {
    const context: SetPasswordContext = search.context ?? "invite";
    return (
      <AuthShell
        title="Definir senha"
        subtitle={
          context === "invite"
            ? "Bem-vindo(a)! Crie sua senha para acessar o portal."
            : "Escolha uma nova senha para continuar."
        }
      >
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
            {loading ? "Aguarde…" : context === "invite" ? "Salvar senha" : "Salvar nova senha"}
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Entrar" subtitle={`${BRAND_NAME} — ${BRAND_TAGLINE.toLowerCase()}`}>
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
      <button
        type="button"
        onClick={() => router.navigate({ to: "/auth", search: { view: "forgot-password" } })}
        className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
      >
        Esqueci minha senha
      </button>
      <p className="text-center text-xs text-muted-foreground">
        Acesso mediante convite da equipe {BRAND_NAME}. Em caso de dúvida, fale com seu gestor de
        conta.
      </p>
    </AuthShell>
  );
}
