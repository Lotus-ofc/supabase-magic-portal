import { Link, useRouterState } from "@tanstack/react-router";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LotusWordmark } from "./LotusMark";
import { ThemeToggle } from "./ThemeToggle";
import type { ReactNode } from "react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** If true, only highlights when the pathname starts with `to`. Defaults to true for non-root. */
  prefixMatch?: boolean;
  /** Optional badge content (string/number) rendered to the right. */
  badge?: ReactNode;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export interface AppShellProps {
  children: ReactNode;
  groups: NavGroup[];
  /** "admin" tightens density; "client" gives extra breathing room. */
  variant?: "admin" | "client";
  topRight?: ReactNode;
  bottomSlot?: ReactNode;
}

export function AppShell({
  children,
  groups,
  variant = "admin",
  topRight,
  bottomSlot,
}: AppShellProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar (fixed) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-sidebar-border bg-sidebar lg:flex",
        )}
      >
        <div className="flex h-14 items-center px-5">
          <Link to="/" className="lotus-focus rounded-md">
            <LotusWordmark />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-6 pt-2">
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
                        className={cn(
                          "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-sidebar-foreground/80 transition-colors",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
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

        {bottomSlot && <div className="border-t border-sidebar-border p-3">{bottomSlot}</div>}
      </aside>

      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65 lg:pl-[248px]">
        <div
          className={cn(
            "flex h-14 items-center gap-3 px-4 sm:px-6",
            variant === "client" ? "lg:px-10" : "lg:px-8",
          )}
        >
          <div className="lg:hidden">
            <LotusWordmark />
          </div>
          <div className="ml-auto flex items-center gap-2">
            {topRight}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className={cn("lg:pl-[248px]")}>
        <div
          className={cn(
            "mx-auto w-full",
            variant === "admin"
              ? "max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7"
              : "max-w-[1240px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10",
          )}
        >
          <div className="animate-lotus-fade">{children}</div>
        </div>
      </main>
    </div>
  );
}
