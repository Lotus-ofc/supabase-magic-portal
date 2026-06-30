import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChangePasswordForm } from "@/modules/auth";
import { postAuthOnPasswordChangedByUser } from "@/modules/access/post-auth-orchestrator.server";
import { brandTitle } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/account/security")({
  ssr: false,
  head: () => ({ meta: [{ title: brandTitle("Segurança da conta") }] }),
  component: AccountSecurityPage,
});

function AccountSecurityPage() {
  const router = useRouter();
  const { user } = Route.useRouteContext({ from: "/_authenticated" });
  const passwordChangedFn = useServerFn(postAuthOnPasswordChangedByUser);

  return (
    <div className="mx-auto max-w-md space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Segurança da conta</h1>
        <p className="text-sm text-muted-foreground">
          Altere sua senha de acesso ({user.email ?? "—"}).
        </p>
      </div>

      <ChangePasswordForm email={user.email} onPasswordChanged={() => passwordChangedFn()} />

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
