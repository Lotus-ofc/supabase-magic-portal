import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileBarChart,
  LayoutDashboard,
  Search,
  Users,
  Compass,
  Palette,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";

import { slugify } from "@/lib/slug";

interface SearchRoute {
  id: string;
  label: string;
  hint?: string;
  href: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  keywords?: string[];
}

const STATIC_ROUTES: SearchRoute[] = [
  {
    id: "dashboard",
    label: "Visão geral (cliente)",
    href: "/dashboard",
    icon: LayoutDashboard,
    keywords: ["home", "painel", "métricas"],
  },
  {
    id: "aprovacoes",
    label: "Aprovações pendentes",
    href: "/aprovacoes",
    icon: ClipboardCheck,
    keywords: ["posts", "conteúdo", "aprovar"],
  },
  {
    id: "plano-estrategico",
    label: "Plano Estratégico",
    href: "/plano-estrategico",
    icon: Compass,
    keywords: ["estratégia", "objetivos", "centro estratégico"],
  },
  {
    id: "admin",
    label: "Admin — Visão geral",
    href: "/admin",
    icon: LayoutDashboard,
    adminOnly: true,
  },
  {
    id: "relatorios",
    label: "Relatórios",
    href: "/admin/relatorios",
    icon: FileBarChart,
    adminOnly: true,
    keywords: ["export", "pdf"],
  },
  {
    id: "editorial",
    label: "Calendário editorial",
    href: "/admin/editorial",
    icon: CalendarDays,
    adminOnly: true,
    keywords: ["posts", "publicação"],
  },
  {
    id: "plano-admin",
    label: "Plano Estratégico (admin)",
    href: "/admin/plano-estrategico",
    icon: Compass,
    adminOnly: true,
    keywords: ["estratégia", "objetivos"],
  },
  {
    id: "clientes",
    label: "Clientes",
    href: "/admin/clientes",
    icon: Users,
    adminOnly: true,
  },
  {
    id: "usuarios",
    label: "Usuários",
    href: "/admin/usuarios",
    icon: Users,
    adminOnly: true,
  },
  {
    id: "knowledge",
    label: "Knowledge Center",
    href: "/admin/knowledge",
    icon: BookOpen,
    adminOnly: true,
    keywords: ["docs", "documentação"],
  },
  {
    id: "branding",
    label: "Branding Lots BI",
    href: "/admin/branding",
    icon: Palette,
    adminOnly: true,
    keywords: ["cores", "logo", "identidade", "marca", "hex"],
  },
  {
    id: "metricas",
    label: "Métricas — glossário",
    href: "/admin/knowledge",
    icon: BarChart3,
    keywords: ["ctr", "cpa", "cpc", "alcance", "sessões", "conversões"],
  },
];

export function GlobalSearch({ isAdmin = false }: { isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const { data: clientes = [] } = useQuery({
    queryKey: ["search-clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_clientes_ativos")
        .select("cliente")
        .order("cliente");
      if (error) throw error;
      return (data ?? []).map((r: { cliente: string }) => r.cliente);
    },
    staleTime: 5 * 60_000,
    enabled: open,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const routes = useMemo(() => STATIC_ROUTES.filter((r) => !r.adminOnly || isAdmin), [isAdmin]);

  const needle = q.trim().toLowerCase();

  const filteredRoutes = useMemo(() => {
    if (!needle) return routes;
    return routes.filter((r) => {
      const hay = [r.label, r.hint, ...(r.keywords ?? [])].join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [routes, needle]);

  const filteredClientes = useMemo(() => {
    if (!needle) return clientes.slice(0, 8);
    return clientes.filter((c) => c.toLowerCase().includes(needle)).slice(0, 8);
  }, [clientes, needle]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    navigate({ to: href });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden h-9 gap-2 text-muted-foreground sm:inline-flex"
        onClick={() => setOpen(true)}
        aria-label="Pesquisa global"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs">Buscar…</span>
        <kbd className="pointer-events-none hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] lg:inline">
          Ctrl+K
        </kbd>
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 sm:hidden"
        onClick={() => setOpen(true)}
        aria-label="Pesquisa global"
      >
        <Search className="h-4 w-4" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Clientes, rotas, métricas, aprovações…"
          value={q}
          onValueChange={setQ}
        />
        <CommandList>
          <CommandEmpty>Nenhum resultado.</CommandEmpty>

          {filteredRoutes.length > 0 && (
            <CommandGroup heading="Navegação">
              {filteredRoutes.map((r) => {
                const Icon = r.icon;
                return (
                  <CommandItem key={r.id} value={r.label} onSelect={() => go(r.href)}>
                    <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{r.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {filteredClientes.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Clientes">
                {filteredClientes.map((nome) => {
                  const slug = slugify(nome);
                  return (
                    <CommandItem key={nome} value={nome} onSelect={() => go(`/cliente/${slug}`)}>
                      <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{nome}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
