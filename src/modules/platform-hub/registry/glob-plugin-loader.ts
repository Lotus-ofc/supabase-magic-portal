import type { PluginLoaderPort, PluginRegistration } from "@/modules/platform-hub/ports";

type RegisterModule = {
  getPluginRegistration?: () => PluginRegistration;
};

const registerModules = import.meta.glob<RegisterModule>("../plugins/*/*.register.ts", {
  eager: true,
});

/**
 * Descobre plugins via register.ts — única responsabilidade: carregar registrations.
 */
export class GlobPluginLoader implements PluginLoaderPort {
  load(): readonly PluginRegistration[] {
    const registrations: PluginRegistration[] = [];

    for (const mod of Object.values(registerModules)) {
      if (typeof mod.getPluginRegistration !== "function") {
        continue;
      }
      registrations.push(mod.getPluginRegistration());
    }

    return registrations.sort((a, b) => a.manifest.key.localeCompare(b.manifest.key));
  }
}
