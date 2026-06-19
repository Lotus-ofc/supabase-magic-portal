import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { checkIsAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { isAdmin } = await checkIsAdmin();
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Administração</h1>
        <nav className="flex gap-2 text-sm">
          <Link
            to="/admin/clientes"
            className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            activeProps={{ className: "bg-accent text-foreground" }}
          >
            Clientes
          </Link>
          <Link
            to="/admin/servicos"
            className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            activeProps={{ className: "bg-accent text-foreground" }}
          >
            Serviços
          </Link>
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
