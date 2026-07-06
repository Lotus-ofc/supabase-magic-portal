import type { ComponentType, LazyExoticComponent } from "react";
import type { Permission } from "./permissions";

export interface WidgetProps {
  clientId?: number;
  context?: Record<string, unknown>;
}

export type WidgetComponent = ComponentType<WidgetProps>;

export interface WidgetDefinition {
  id: string;
  module: string;
  title: string;
  description?: string;
  permissions?: Permission[];
  /** Colunas no grid (1–2). */
  colSpan?: 1 | 2;
  lazy?: boolean;
  queryKeyPrefix?: string;
  refreshIntervalMs?: number;
  component: WidgetComponent | LazyExoticComponent<WidgetComponent>;
}

export interface DashboardDefinition {
  id: string;
  module: string;
  title: string;
  widgetIds: string[];
}
