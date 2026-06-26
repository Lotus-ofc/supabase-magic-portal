import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  /** Percent change vs previous period (e.g. 12.4 for +12.4%). */
  delta?: number | null;
  /** When true, a positive delta is GOOD (green). Set false for things like CPC. */
  positiveIsGood?: boolean;
  /** Visual weight — `hero` for the executive headline KPI. */
  emphasis?: "hero" | "default" | "compact";
  className?: string;
}

const numberFmt = (v: string | number) => (typeof v === "number" ? v.toLocaleString("pt-BR") : v);

/**
 * StatCard — KPI card with optional delta + context. Solid surface (no glass),
 * subtle petal accent on `hero` variant, branded hover lift.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  delta,
  positiveIsGood = true,
  emphasis = "default",
  className,
}: StatCardProps) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const trend = hasDelta ? (delta === 0 ? "flat" : delta > 0 ? "up" : "down") : null;
  const good = trend === "flat" || trend === null ? null : (trend === "up") === positiveIsGood;

  const isHero = emphasis === "hero";
  const isCompact = emphasis === "compact";

  return (
    <div
      className={cn(
        "lotus-surface lotus-hoverable relative flex flex-col justify-between overflow-hidden",
        isHero && "lotus-petal-accent bg-gradient-to-br from-card to-card/60",
        isCompact ? "p-4" : "p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "font-medium uppercase tracking-[0.08em] text-muted-foreground",
            isHero ? "text-[11px]" : "text-[10.5px]",
          )}
        >
          {label}
        </p>
        {Icon && (
          <span
            className={cn(
              "grid place-items-center rounded-lg border border-border/70 bg-background/60 text-primary-600 dark:text-primary-300",
              isCompact ? "h-7 w-7" : "h-8 w-8",
            )}
          >
            <Icon className="h-[14px] w-[14px]" />
          </span>
        )}
      </div>

      <div className={cn("mt-3 flex items-baseline gap-2", isHero && "mt-5")}>
        <span
          className={cn(
            "font-display font-semibold tracking-[-0.02em] tabular-nums text-foreground",
            isHero ? "text-4xl" : isCompact ? "text-xl" : "text-2xl",
          )}
        >
          {numberFmt(value)}
        </span>
        {hasDelta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
              good === null && "bg-muted text-muted-foreground",
              good === true && "bg-success/12 text-[color:var(--success)]",
              good === false && "bg-danger/12 text-[color:var(--danger)]",
            )}
          >
            {trend === "flat" ? (
              <Minus className="h-3 w-3" />
            ) : trend === "up" ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(delta!).toFixed(1)}%
          </span>
        )}
      </div>

      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
