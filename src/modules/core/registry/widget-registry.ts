import type { WidgetDefinition } from "../types/widgets";
import { configRegistry } from "./config-registry";

class WidgetRegistry {
  get(id: string): WidgetDefinition | undefined {
    return configRegistry.allWidgets().find((w) => w.id === id);
  }

  list(moduleId?: string): WidgetDefinition[] {
    const all = configRegistry.allWidgets();
    return moduleId ? all.filter((w) => w.module === moduleId) : all;
  }

  listForPermissions(userPermissions: string[]): WidgetDefinition[] {
    return this.list().filter((w) => {
      if (!w.permissions?.length) return true;
      return w.permissions.some((p) => userPermissions.includes(p));
    });
  }
}

export const widgetRegistry = new WidgetRegistry();
