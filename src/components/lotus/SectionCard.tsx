import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Padding for the body (default px-5 py-5). */
  bodyClassName?: string;
}

export function SectionCard({
  title,
  description,
  eyebrow,
  actions,
  children,
  className,
  bodyClassName,
}: SectionCardProps) {
  return (
    <section className={cn("lotus-surface overflow-hidden", className)}>
      <header className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary-600 dark:text-primary-300">
              {eyebrow}
            </p>
          )}
          <h2 className="truncate font-display text-[15px] font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className={cn("px-5 py-5", bodyClassName)}>{children}</div>
    </section>
  );
}
