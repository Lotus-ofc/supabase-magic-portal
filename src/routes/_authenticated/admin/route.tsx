import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { checkIsAdmin } from "@/lib/admin.functions";
import { isPlatformOwnerEmail } from "@/lib/platform-owner";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const user = context.user;
  // Dono: não depende de server function no beforeLoad (evita tela preta se env server falhar).
    if (isPlatformOwnerEmail(user?.email)) return;

    try {
      const { isAdmin } = await checkIsAdmin();
      if (!isAdmin) throw redirect({ to: "/dashboard" });
    } catch (err) {
      if (isRedirect(err)) throw err;
      throw redirect({ to: "/dashboard" });
    }
  },
  pendingComponent: AdminPending,
  component: () => <Outlet />,
});

function AdminPending() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-sm text-muted-foreground">Carregando painel admin…</p>
    </div>
  );
}
