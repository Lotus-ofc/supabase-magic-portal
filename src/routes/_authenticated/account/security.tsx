import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildLotsBiMetadataPatch } from "@/features/access/lots-bi-metadata";
import { markPasswordChangedByUser } from "@/lib/access.functions.server";
import { brandTitle } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/account/security")({
  ssr: false,
  head: () => ({ meta: [{ title: brandTitle("Segurança da conta") }] }),
  component: AccountSecurityPage,
});

function AccountSecurityPage() {
  const router = useRouter();
  const { user } = Route.useRouteContext({ from: "/_authenticated" });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (!user.email) {
      setError("E-mail do usuário indisponível.");
      return;
    }

    setLoading(true);
    try {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (reauthError) throw new Error("Senha atual incorreta.");

      const now = new Date().toISOString();
      const metadataPatch = buildLotsBiMetadataPatch({ password_set_at: now }, user.user_metadata);

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        data: metadataPatch,
      });
      if (updateError) throw updateError;

      await markPasswordChangedByUser();

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Segurança da conta</h1>
        <p className="text-sm text-muted-foreground">
          Altere sua senha de acesso ({user.email ?? "—"}).
        </p>
      </div>

      <form
        onSubmit={submitChangePassword}
        className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm"
      >
        <div>
          <label className="text-sm font-medium">Senha atual</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="lotus-focus mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Nova senha</label>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="lotus-focus mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Confirmar nova senha</label>
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
        {success && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Senha alterada com sucesso.
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Aguarde…" : "Salvar nova senha"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => router.navigate({ to: "/dashboard" })}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        Voltar ao painel
      </button>
    </div>
  );
}
