import { cn } from "@/lib/utils";

interface LotusMarkProps extends React.SVGProps<SVGSVGElement> {
  /** Render with a static gradient (default) or a flat single-color tint. */
  variant?: "gradient" | "flat";
}

/**
 * LotusMark — abstract three-curve petal. Conceptual reference to growth and
 * organic movement; intentionally NOT a literal flower icon. Used as the
 * single brand identity element across the app (logo lockup, splash, empty
 * states). Never duplicate as a generic decorative icon.
 */
export function LotusMark({ variant = "gradient", className, ...props }: LotusMarkProps) {
  const id = "lotus-mark-grad";
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="Lotus"
      className={cn("h-7 w-7", className)}
      {...props}
    >
      {variant === "gradient" && (
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary-500)" />
            <stop offset="100%" stopColor="var(--secondary-500)" />
          </linearGradient>
        </defs>
      )}
      {/* Three overlapping curves forming an upward opening — growth motif */}
      <g
        fill="none"
        stroke={variant === "gradient" ? `url(#${id})` : "currentColor"}
        strokeWidth="2.2"
        strokeLinecap="round"
      >
        <path d="M16 28 C 6 22, 6 12, 16 4" opacity="0.55" />
        <path d="M16 28 C 26 22, 26 12, 16 4" opacity="0.55" />
        <path d="M16 28 C 16 22, 16 12, 16 4" />
      </g>
      <circle
        cx="16"
        cy="28"
        r="1.6"
        fill={variant === "gradient" ? `url(#${id})` : "currentColor"}
      />
    </svg>
  );
}

export function LotusWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LotusMark className="h-7 w-7" />
      <span className="font-display text-[15px] font-semibold tracking-[-0.02em] text-foreground">
        Lotus
      </span>
    </div>
  );
}
