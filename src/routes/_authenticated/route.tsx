import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const { data: adminCheck } = useQuery({
    queryKey: ["me", "isAdmin"],
    queryFn: () => checkIsAdmin(),
    staleTime: 60_000,
  });
  const isAdmin = adminCheck?.isAdmin;

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="text-lg font-semibold tracking-tight">
              Majrá · Portal
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link to="/dashboard" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>
                Dashboard
              </Link>
              {isAdmin && (
                <Link to="/admin/clientes" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>
                  Admin
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{user.email}</span>
            <button
              onClick={signOut}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

