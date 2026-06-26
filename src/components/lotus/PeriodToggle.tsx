// Lotus · PeriodToggle
// Toggle 7/30/90 dias — extraído para reuso em todos os dashboards.
import { cn } from "@/lib/utils";

export type PeriodDays = 7 | 30 | 90;

const OPTIONS: { value: PeriodDays; label: string }[] = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
];

interface Props {
  value: PeriodDays;
  onChange: (v: PeriodDays) => void;
  className?: string;
}

export function PeriodToggle({ value, onChange, className }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Período"
      className={cn("lotus-surface inline-flex p-0.5", className)}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "lotus-focus rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === opt.value
              ? "bg-primary text-primary-foreground shadow-[var(--shadow-xs)]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
