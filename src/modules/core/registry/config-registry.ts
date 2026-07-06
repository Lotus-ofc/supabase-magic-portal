import type { CommandDefinition } from "../types/commands";
import type { DomainEventType } from "../types/domain-events";
import type { FeatureFlagDefinition } from "../types/feature-flags";
import type { ModuleConfig, ModuleRouteDef } from "../types/module-config";
import type { Permission } from "../types/permissions";
import type { SearchProvider } from "../types/search";
import type { DashboardDefinition, WidgetDefinition } from "../types/widgets";
import { commandBus } from "../commands/command-bus";
import { featureFlagService } from "../feature-flags/feature-flag-service";

/** Registro central de módulos — ponto único de integração do OS. */
class ConfigRegistry {
  private modules = new Map<string, ModuleConfig>();

  register(config: ModuleConfig): void {
    if (this.modules.has(config.id)) {
      console.warn(`[ConfigRegistry] module re-registered: ${config.id}`);
    }
    this.modules.set(config.id, config);

    for (const cmd of config.commands ?? []) {
      commandBus.register(cmd);
    }
    for (const flag of config.featureFlags ?? []) {
      featureFlagService.register(flag);
    }
  }

  getModule(id: string): ModuleConfig | undefined {
    return this.modules.get(id);
  }

  listModules(): ModuleConfig[] {
    return [...this.modules.values()];
  }

  allRoutes(): ModuleRouteDef[] {
    return this.listModules().flatMap((m) => m.routes ?? []);
  }

  allWidgets(): WidgetDefinition[] {
    return this.listModules().flatMap((m) => m.widgets ?? []);
  }

  allDashboards(): DashboardDefinition[] {
    return this.listModules().flatMap((m) => m.dashboards ?? []);
  }

  allSearchProviders(): SearchProvider[] {
    return this.listModules().flatMap((m) => m.searchProviders ?? []);
  }

  allEvents(): DomainEventType[] {
    const set = new Set<DomainEventType>();
    for (const m of this.listModules()) {
      for (const e of m.events ?? []) set.add(e);
    }
    return [...set];
  }

  allPermissions(): Permission[] {
    const set = new Set<Permission>();
    for (const m of this.listModules()) {
      for (const p of m.permissions ?? []) set.add(p);
    }
    return [...set];
  }
}

export const configRegistry = new ConfigRegistry();
