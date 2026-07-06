import type { LucideIcon } from "lucide-react";
import type { CommandDefinition } from "./commands";
import type { DomainEventType } from "./domain-events";
import type { FeatureFlagDefinition } from "./feature-flags";
import type { Permission } from "./permissions";
import type { SearchProvider } from "./search";
import type { DashboardDefinition, WidgetDefinition } from "./widgets";

export interface ModuleRouteDef {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  adminOnly?: boolean;
  keywords?: string[];
}

export interface ModuleConfig {
  id: string;
  label: string;
  routes?: ModuleRouteDef[];
  widgets?: WidgetDefinition[];
  dashboards?: DashboardDefinition[];
  searchProviders?: SearchProvider[];
  commands?: CommandDefinition[];
  events?: DomainEventType[];
  permissions?: Permission[];
  featureFlags?: FeatureFlagDefinition[];
}
