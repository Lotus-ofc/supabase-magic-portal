/** Current Data Sources — Passive Production Integration (read-only). */
export const CURRENT_METRIC_DATA_SOURCES = [
  { id: "make", label: "Make", status: "active" as const },
  { id: "platform_hub_memory", label: "Platform Hub Memory", status: "active" as const },
  {
    id: "platform_hub_supabase",
    label: "Platform Hub Supabase",
    status: "feature_flagged" as const,
    envVar: "PLATFORM_HUB_SUPABASE_WRITER",
  },
] as const;

export function formatDataSourcesMarkdown(): string {
  const lines = CURRENT_METRIC_DATA_SOURCES.map((source) => {
    const suffix = source.status === "feature_flagged" ? ` (flag: ${source.envVar}=true)` : "";
    return `- ✔ ${source.label}${suffix}`;
  });
  return ["## Current Data Sources (métricas)", ...lines].join("\n");
}
