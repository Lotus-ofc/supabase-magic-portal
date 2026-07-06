import { Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import type { NavNode } from "@/lib/knowledge-center";
import { tutorialBasePath, type TutorialAudience } from "@/lib/platform-tutorial";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function TutorialSidebar({
  audience,
  tree,
  currentSlug,
  onNavigate,
}: {
  audience: TutorialAudience;
  tree: NavNode[];
  currentSlug?: string;
  onNavigate?: () => void;
}) {
  const base = tutorialBasePath(audience);
  const title = audience === "admin" ? "Tutorial — Admin" : "Tutorial — Cliente";

  return (
    <aside className="flex h-full flex-col border-r border-border bg-sidebar/40">
      <div className="border-b border-border px-4 py-3">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Ajuda
        </p>
        <p className="mt-0.5 text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{BRAND_NAME}</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Link
          to={base}
          onClick={onNavigate}
          className={cn(
            "mb-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] font-medium transition-colors",
            !currentSlug
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60",
          )}
        >
          Início do tutorial
        </Link>
        <div className="space-y-0.5">
          {tree.map((node) => {
            if (!node.slug) return null;
            const splat = node.slug.replace(/^admin\/|^client\//, "");
            const isActive = node.slug === currentSlug;
            return (
              <Link
                key={node.id}
                to={`${base}/$`}
                params={{ _splat: splat }}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] transition-colors",
                  isActive
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <FileText className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <span className="truncate">{node.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
