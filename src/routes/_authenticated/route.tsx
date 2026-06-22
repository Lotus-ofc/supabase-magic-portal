import { createFileRoute, Outlet, redirect, useRouter, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/lib/admin.functions";
import { AppShell, type NavGroup } from "@/components/lotus/AppShell";
import { ImpersonateClienteMenu } from "@/components/lotus/ImpersonateClienteMenu";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  LogOut,
  Sparkles,
  UserCircle2,
  Bug,
  FileBarChart,
} from "lucide-react";

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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const inAdmin = pathname.startsWith("/admin");

  const { data: adminCheck } = useQuery({
    queryKey: ["me", "isAdmin"],
    queryFn: () => checkIsAdmin(),
    staleTime: 60_000,
  });
  const isAdmin = !!adminCheck?.isAdmin;

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  const adminGroups: NavGroup[] = [
    {
      label: "Operações",
      items: [
        { to: "/admin", label: "Visão geral", icon: LayoutDashboard, prefixMatch: false },
        { to: "/admin/relatorios", label: "Relatórios", icon: FileBarChart },
        { to: "/admin/clientes", label: "Clientes", icon: Users },
        { to: "/admin/usuarios", label: "Usuários", icon: UserCircle2 },
        { to: "/admin/servicos", label: "Serviços", icon: Briefcase },
      ],
    },
    {
      label: "Diagnóstico",
      items: [
        { to: "/admin/debug", label: "Debug de dados", icon: Bug },
        { to: "/admin/debug/views", label: "Auditoria de views", icon: Bug },
      ],
    },
  ];

  const clientGroups: NavGroup[] = [
    {
      label: "Plataforma",
      items: [
        { to: "/dashboard", label: "Visão geral", icon: LayoutDashboard, prefixMatch: false },
      ],
    },
    ...(isAdmin
      ? [
          {
            label: "Acesso interno",
            items: [{ to: "/admin", label: "Painel admin", icon: Sparkles, prefixMatch: false }],
          } as NavGroup,
        ]
      : []),
  ];

  const groups = inAdmin && isAdmin ? adminGroups : clientGroups;
  const variant: "admin" | "client" = inAdmin && isAdmin ? "admin" : "client";

  return (
    <AppShell
      variant={variant}
      groups={groups}
      topRight={
        <div className="flex items-center gap-2">
          {inAdmin && isAdmin && <ImpersonateClienteMenu />}
          <div className="hidden text-right sm:block">
            <p className="text-[12px] font-medium leading-tight text-foreground">
              {user.email?.split("@")[0]}
            </p>
            <p className="text-[10.5px] leading-tight text-muted-foreground">
              {isAdmin ? "Administrador" : "Cliente"}
            </p>
          </div>
          <button
            onClick={signOut}
            className="lotus-focus inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary-300 hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      }
      bottomSlot={
        <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/60 px-2.5 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-[12px] font-semibold text-primary-foreground">
            {user.email?.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-sidebar-foreground">
              {user.email}
            </p>
            <p className="text-[10.5px] text-muted-foreground">
              {isAdmin ? "Admin · Lotus" : "Cliente · Lotus"}
            </p>
          </div>
        </div>
      }
    >
      <Outlet />
    </AppShell>
  );
}
