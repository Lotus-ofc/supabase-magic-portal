import type { TocItem } from "@/lib/knowledge-center";
import { cn } from "@/lib/utils";

interface KnowledgeTocProps {
  items: TocItem[];
  className?: string;
}

export function KnowledgeToc({ items, className }: KnowledgeTocProps) {
  if (items.length < 2) return null;

  return (
    <nav aria-label="Índice do documento" className={cn("text-xs", className)}>
      <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Nesta página
      </p>
      <ul className="space-y-1.5 border-l border-border pl-3">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                "block py-0.5 text-muted-foreground transition-colors hover:text-foreground",
                item.level === 2 && "font-medium",
                item.level === 3 && "pl-2 text-[11px]",
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
