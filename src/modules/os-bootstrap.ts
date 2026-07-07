/**
 * Bootstrap do Operating System — importar uma vez no app (client + server).
 * Novos módulos registram-se aqui.
 */
import { registerAgencyOsCommands } from "@/modules/agency-os/commands/register-commands";
import { registerAgencyOsModule } from "@/modules/agency-os/register-with-core";

const BOOTSTRAP_KEY = Symbol.for("lots.bi.osBootstrap");

export function bootstrapOs(): void {
  // Sempre re-registra comandos (idempotente) — cobre HMR e chunks SSR separados.
  registerAgencyOsCommands();

  const g = globalThis as typeof globalThis & { [BOOTSTRAP_KEY]?: boolean };
  if (g[BOOTSTRAP_KEY]) return;
  g[BOOTSTRAP_KEY] = true;
  registerAgencyOsModule();
}

bootstrapOs();
