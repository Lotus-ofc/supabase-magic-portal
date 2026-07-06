import type {
  FeatureFlagContext,
  FeatureFlagDefinition,
  FeatureFlagStatus,
} from "../types/feature-flags";

type FlagOverride = {
  status: FeatureFlagStatus;
  scope: "global" | "organization" | "user" | "environment";
  targetId?: string | null;
};

/** Feature flags in-memory + overrides — persistência opcional via DB. */
export class FeatureFlagService {
  private definitions = new Map<string, FeatureFlagDefinition>();
  private overrides: FlagOverride[] = [];

  register(def: FeatureFlagDefinition): void {
    this.definitions.set(def.key, def);
  }

  setOverride(override: FlagOverride & { key: string }): void {
    this.overrides = this.overrides.filter(
      (o) =>
        !(
          (o as FlagOverride & { key: string }).key === override.key &&
          o.scope === override.scope &&
          o.targetId === override.targetId
        ),
    );
    this.overrides.push(override);
  }

  isEnabled(key: string, ctx: FeatureFlagContext = {}): boolean {
    const status = this.resolve(key, ctx);
    return status === "on" || status === "beta" || status === "experimental";
  }

  resolve(key: string, ctx: FeatureFlagContext = {}): FeatureFlagStatus {
    const def = this.definitions.get(key);
    if (!def) return "off";

    const env = ctx.environment ?? import.meta.env.MODE ?? "development";

    for (const o of this.overrides) {
      const entry = o as FlagOverride & { key?: string };
      if ((entry as { key: string }).key !== key) continue;
      if (o.scope === "user" && o.targetId === ctx.userId) return o.status;
      if (o.scope === "organization" && o.targetId === ctx.organizationId) return o.status;
      if (o.scope === "environment" && o.targetId === env) return o.status;
      if (o.scope === "global") return o.status;
    }

    return def.defaultStatus;
  }

  list(): FeatureFlagDefinition[] {
    return [...this.definitions.values()];
  }
}

export const featureFlagService = new FeatureFlagService();
