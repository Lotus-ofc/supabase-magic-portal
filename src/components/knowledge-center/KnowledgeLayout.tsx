import { useState } from "react";
import type { ReactNode } from "react";
import { Outlet } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import { kcNavQuery } from "@/lib/knowledge-center/registry";
import { KnowledgeSearchDialog } from "./KnowledgeSearchDialog";
import { KnowledgeSidebar } from "./KnowledgeSidebar";
import { useKnowledgeCurrentSlug } from "./useKnowledgeCurrentSlug";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export function KnowledgeLayout({ children }: { children?: ReactNode }) {
  const { data: tree } = useSuspenseQuery(kcNavQuery);
  const currentSlug = useKnowledgeCurrentSlug();
  const [navOpen, setNavOpen] = useState(false);

  const closeNav = () => setNavOpen(false);

  return (
    <div className="-mx-4 -my-6 flex min-h-[calc(100dvh-3.5rem)] flex-col sm:-mx-6 lg:-mx-8">
      <div className="flex items-center gap-2 border-b border-border bg-background/80 px-4 py-3 backdrop-blur sm:gap-3 sm:px-6">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 lg:hidden"
          onClick={() => setNavOpen(true)}
          aria-label="Abrir índice da documentação"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <KnowledgeSearchDialog />
      </div>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent
          side="left"
          className="flex w-[min(100vw-2rem,280px)] max-w-[280px] flex-col gap-0 border-sidebar-border bg-sidebar p-0 pt-[env(safe-area-inset-top)] [&>button]:top-[max(0.875rem,env(safe-area-inset-top))]"
          aria-describedby={undefined}
        >
          <SheetTitle className="sr-only">Índice da documentação</SheetTitle>
          <KnowledgeSidebar tree={tree} currentSlug={currentSlug} onNavigate={closeNav} />
        </SheetContent>
      </Sheet>

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
