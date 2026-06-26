import type { ReactNode } from "react";
import { Outlet } from "@tanstack/react-router";
import { getNavigationTree } from "@/lib/knowledge-center";
import { KnowledgeSearchDialog } from "./KnowledgeSearchDialog";
import { KnowledgeSidebar } from "./KnowledgeSidebar";
import { useKnowledgeCurrentSlug } from "./useKnowledgeCurrentSlug";

export function KnowledgeLayout({ children }: { children?: ReactNode }) {
  const tree = getNavigationTree();
  const currentSlug = useKnowledgeCurrentSlug();

  return (
    <div className="-mx-4 -my-6 flex min-h-[calc(100vh-3.5rem)] flex-col sm:-mx-6 lg:-mx-8">
      <div className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur sm:px-6">
        <KnowledgeSearchDialog />
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[260px] shrink-0 lg:block">
          <KnowledgeSidebar tree={tree} currentSlug={currentSlug} />
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
            {children ?? <Outlet />}
          </div>
        </div>
      </div>
    </div>
  );
}
