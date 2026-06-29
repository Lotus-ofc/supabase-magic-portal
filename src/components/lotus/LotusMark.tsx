import { cn } from "@/lib/utils";
import { BRAND_ASSETS, BRAND_NAME } from "@/lib/brand";

type LogoSize = "sm" | "md" | "lg";

const iconSize: Record<LogoSize, string> = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

const wordmarkHeight: Record<LogoSize, string> = {
  sm: "h-6",
  md: "h-8",
  lg: "h-10",
};

/** Ícone Lots BI (pétala com gradiente roxo → azul). */
export function LotsBIIcon({
  className,
  size = "md",
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & { size?: LogoSize }) {
  return (
    <img
      src={BRAND_ASSETS.icon}
      alt=""
      aria-hidden
      className={cn("object-contain", iconSize[size], className)}
      {...props}
    />
  );
}

/** Lockup completo: ícone + “Lots BI”. */
export function LotsBIWordmark({
  className,
  size = "md",
}: {
  className?: string;
  size?: LogoSize;
}) {
  return (
    <div className={cn("flex items-center", className)}>
      <img
        src={BRAND_ASSETS.logoFull}
        alt={BRAND_NAME}
        className={cn("w-auto max-w-[148px] object-contain object-left", wordmarkHeight[size])}
      />
    </div>
  );
}

/** @deprecated Use LotsBIIcon */
export const LotusMark = LotsBIIcon;

/** @deprecated Use LotsBIWordmark */
export const LotusWordmark = LotsBIWordmark;
