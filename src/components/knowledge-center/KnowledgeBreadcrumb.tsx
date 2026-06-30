import { Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight, Home } from "lucide-react";
import { breadcrumbForSlug } from "@/lib/knowledge-center/navigation";
import { ensureRegistry } from "@/lib/knowledge-center/registry";

function kcBreadcrumbQuery(slug: string) {
  return queryOptions({
    queryKey: ["kc", "breadcrumb", slug],
    queryFn: async () => {
      const reg = await ensureRegistry();
      return breadcrumbForSlug(slug, reg.bySlug);
    },
    staleTime: Infinity,
  });
}

interface KnowledgeBreadcrumbProps {
  slug: string;
}

export function KnowledgeBreadcrumb({ slug }: KnowledgeBreadcrumbProps) {
  const { data: crumbs } = useSuspenseQuery(kcBreadcrumbQuery(slug));

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
    >
      <Link
        to="/admin/knowledge"
        className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:text-foreground"
      >
        <Home className="h-3.5 w-3.5" />
        Knowledge Center
      </Link>
      {crumbs.slice(2).map((crumb, i) => (
        <span key={`${crumb.label}-${i}`} className="inline-flex items-center gap-1">
          <ChevronRight className="h-3 w-3 opacity-50" />
          {crumb.slug ? (
            <Link
              to="/admin/knowledge/$"
              params={{ _splat: crumb.slug }}
              className="rounded-md px-1 py-0.5 transition-colors hover:text-foreground"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="px-1 py-0.5 text-foreground">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
