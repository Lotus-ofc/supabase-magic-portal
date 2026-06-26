import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, FileText, Folder } from "lucide-react";
import type { NavNode } from "@/lib/knowledge-center";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface KnowledgeSidebarProps {
  tree: NavNode[];
  currentSlug?: string;
}

function nodeContainsSlug(node: NavNode, slug: string): boolean {
  if (node.slug === slug) return true;
  return node.children?.some((c) => nodeContainsSlug(c, slug)) ?? false;
}

function NavBranch({
  node,
  currentSlug,
  depth = 0,
}: {
  node: NavNode;
  currentSlug?: string;
  depth?: number;
}) {
  const isDoc = node.type === "doc" && node.slug && (!node.children || node.children.length === 0);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isActive = node.slug === currentSlug;
  const isAncestor = currentSlug ? nodeContainsSlug(node, currentSlug) : false;
  const [open, setOpen] = useState(depth < 2 || isAncestor);

  if (isDoc && node.slug) {
    return (
      <Link
        to="/admin/knowledge/$"
        params={{ _splat: node.slug }}
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] transition-colors",
          isActive
            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
            : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        )}
        style={{ paddingLeft: `${8 + depth * 10}px` }}
      >
        <FileText className="h-3.5 w-3.5 shrink-0 opacity-60" />
        <span className="truncate">{node.label}</span>
      </Link>
    );
  }

  if (!hasChildren && node.slug) {
    return (
      <Link
        to="/admin/knowledge/$"
        params={{ _splat: node.slug }}
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] transition-colors",
          isActive
            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
            : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60",
        )}
        style={{ paddingLeft: `${8 + depth * 10}px` }}
      >
        <FileText className="h-3.5 w-3.5 shrink-0 opacity-60" />
        <span className="truncate">{node.label}</span>
      </Link>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[12.5px] font-medium transition-colors hover:bg-sidebar-accent/50",
          depth === 0 ? "text-foreground" : "text-sidebar-foreground/85",
        )}
        style={{ paddingLeft: `${8 + depth * 10}px` }}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
        )}
        <Folder className="h-3.5 w-3.5 shrink-0 opacity-50" />
        <span className="truncate">{node.label}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-0.5 pb-1 pt-0.5">
        {node.children?.map((child) => (
          <NavBranch key={child.id} node={child} currentSlug={currentSlug} depth={depth + 1} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function KnowledgeSidebar({ tree, currentSlug }: KnowledgeSidebarProps) {
  return (
    <aside className="flex h-full flex-col border-r border-border bg-sidebar/40">
      <div className="border-b border-border px-4 py-3">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Documentação
        </p>
        <p className="mt-0.5 text-sm font-medium text-foreground">Lotus Handbook</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="space-y-0.5">
          {tree.map((node) => (
            <NavBranch key={node.id} node={node} currentSlug={currentSlug} />
          ))}
        </div>
      </nav>
    </aside>
  );
}
