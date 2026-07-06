import type { AgencyCentralFilters } from "./types";

export const agencyOsKeys = {
  all: ["agency-os"] as const,
  central: (filters: AgencyCentralFilters = {}) =>
    [...agencyOsKeys.all, "central", filters] as const,
  priorities: () => [...agencyOsKeys.all, "priorities"] as const,
  kanban: () => [...agencyOsKeys.all, "kanban"] as const,
  pipeline: () => [...agencyOsKeys.all, "pipeline"] as const,
  intelligence: () => [...agencyOsKeys.all, "intelligence"] as const,
  client: (id: number) => [...agencyOsKeys.all, "client", id] as const,
  clientIntelligence: (id: number) => [...agencyOsKeys.all, "client", id, "intelligence"] as const,
  clientProjects: (id: number) => [...agencyOsKeys.all, "client", id, "projects"] as const,
  clientNotes: (id: number) => [...agencyOsKeys.all, "client", id, "notes"] as const,
  clientTimeline: (id: number) => [...agencyOsKeys.all, "client", id, "timeline"] as const,
  search: (query: string) => [...agencyOsKeys.all, "search", query] as const,
};
