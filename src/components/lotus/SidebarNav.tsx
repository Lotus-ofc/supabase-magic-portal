import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { NavGroup } from "./AppShell";

interface SidebarNavProps {
  groups: NavGroup[];
  /** Fecha drawer mobile após navegar. */
  onNavigate?: () => void;
  className?: string;
}

export function SidebarNav({ groups, onNavigate, className }: SidebarNavProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className={cn("flex-1 overflow-y-auto overscroll-contain px-3 pb-6 pt-2", className)}
      aria-label="Navegação principal"
    >
      {groups.map((group, gi) => (
        <div key={gi} className={cn(gi > 0 && "mt-6")}>
          {group.label && (
            <p className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {group.label}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active =
                pathname === item.to ||
                (item.prefixMatch !== false && pathname.startsWith(item.to + "/")) ||
                (item.prefixMatch !== false && pathname.startsWith(item.to) && item.to !== "/");
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => onNavigate?.()}
                    className={cn(
                      "group relative flex min-h-[44px] items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-sidebar-foreground/80 transition-colors",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      "active:scale-[0.98]",
                      active && "bg-sidebar-accent text-sidebar-accent-foreground",
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary"
                      />
                    )}
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        active
                          ? "text-primary-600 dark:text-primary-300"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                      aria-hidden
                    />
                    <span className="truncate">{item.label}</span>
                    {item.badge != null && (
                      <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 text-[10.5px] font-semibold text-primary-700 dark:text-primary-200">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
