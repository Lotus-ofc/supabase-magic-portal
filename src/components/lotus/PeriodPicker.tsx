// Lotus · PeriodPicker
// Substitui o antigo PeriodToggle. Suporta presets BRT + intervalo personalizado.
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Calendar as CalendarIcon, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PERIOD_PRESETS,
  resolvePeriod,
  type Period,
  type PeriodInput,
  type PeriodPreset,
  brtToday,
  formatBR,
} from "@/lib/period";

interface Props {
  value: PeriodInput;
  onChange: (v: PeriodInput) => void;
  className?: string;
}

export function PeriodPicker({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(value.customFrom ?? brtToday());
  const [customTo, setCustomTo] = useState(value.customTo ?? brtToday());
  const rootRef = useRef<HTMLDivElement>(null);

  // Atualiza estado interno quando o controlado muda externamente
  useEffect(() => {
    if (value.customFrom) setCustomFrom(value.customFrom);
    if (value.customTo) setCustomTo(value.customTo);
  }, [value.customFrom, value.customTo]);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const resolved: Period = resolvePeriod(value);

  const pick = (preset: PeriodPreset) => {
    if (preset === "custom") {
      onChange({ preset: "custom", customFrom, customTo });
    } else {
      onChange({ preset });
      setOpen(false);
    }
  };

  const applyCustom = () => {
    onChange({ preset: "custom", customFrom, customTo });
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="lotus-surface lotus-focus inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] font-medium text-foreground hover:bg-muted/40"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="tabular-nums">{resolved.label}</span>
        {value.preset !== "today" && value.preset !== "yesterday" && (
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            · {formatBR(resolved.from)} → {formatBR(resolved.to)}
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div
          role="dialog"
          className="absolute right-0 z-50 mt-2 w-[320px] rounded-xl border border-border bg-popover p-2 shadow-[var(--shadow-lg)]"
        >
          <ul className="max-h-[320px] overflow-y-auto">
            {PERIOD_PRESETS.map((opt) => {
              const active = value.preset === opt.value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => pick(opt.value)}
                    className={cn(
                      "lotus-focus flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[13px] hover:bg-muted/50",
                      active && "bg-primary/10 text-primary-700 dark:text-primary-200",
                    )}
                  >
                    <span>{opt.label}</span>
                    {active && <Check className="h-3.5 w-3.5" />}
                  </button>
                </li>
              );
            })}
          </ul>

          {value.preset === "custom" && (
            <div className="mt-2 border-t border-border/70 pt-3">
              <div className="grid grid-cols-2 gap-2 px-1">
                <label className="block">
                  <span className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                    De
                  </span>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="lotus-focus mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-[12.5px] text-foreground"
                  />
                </label>
                <label className="block">
                  <span className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                    Até
                  </span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="lotus-focus mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-[12.5px] text-foreground"
                  />
                </label>
              </div>
              <div className="mt-3 flex justify-end px-1">
                <button
                  type="button"
                  onClick={applyCustom}
                  className="lotus-focus rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground hover:opacity-90"
                >
                  Aplicar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
