import { cn } from "@/lib/utils";

/**
 * Skeleton premium com shimmer tingido pela marca. Usar em substituição a
 * <Skeleton> da shadcn nos contextos de Lotus.
 */
export function LotusSkeleton({ className }: { className?: string }) {
  return <div className={cn("lotus-skeleton h-4 w-full", className)} />;
}
