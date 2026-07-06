import { useState } from "react";
import { Outlet } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import { tutorialNavQuery, type TutorialAudience } from "@/lib/platform-tutorial";
import { TutorialSidebar } from "./TutorialSidebar";
import { useTutorialCurrentSlug } from "./useTutorialCurrentSlug";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export function TutorialLayout({ audience }: { audience: TutorialAudience }) {
  const { data: tree } = useSuspenseQuery(tutorialNavQuery(audience));
  const currentSlug = useTutorialCurrentSlug(audience);
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="-mx-4 -my-6 flex min-h-[calc(100dvh-3.5rem)] flex-col sm:-mx-6 lg:-mx-8">
      <div className="flex items-center gap-2 border-b border-border bg-background/80 px-4 py-3 backdrop-blur sm:gap-3 sm:px-6">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 lg:hidden"
          onClick={() => setNavOpen(true)}
          aria-label="Abrir índice do tutorial"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <p className="text-sm text-muted-foreground">
          Guia passo a passo — use o índice lateral para navegar entre as seções.
        </p>
      </div>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent
          side="left"
          className="flex w-[min(100vw-2rem,300px)] max-w-[300px] flex-col gap-0 border-sidebar-border bg-sidebar p-0 pt-[env(safe-area-inset-top)] [&>button]:top-[max(0.875rem,env(safe-area-inset-top))]"
          aria-describedby={undefined}
        >
          <SheetTitle className="sr-only">Índice do tutorial</SheetTitle>
          <TutorialSidebar
            audience={audience}
            tree={tree}
            currentSlug={currentSlug}
            onNavigate={() => setNavOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[280px] shrink-0 lg:block">
          <TutorialSidebar audience={audience} tree={tree} currentSlug={currentSlug} />
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
