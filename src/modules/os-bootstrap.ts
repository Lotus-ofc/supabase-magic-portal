/**
 * Bootstrap do Operating System — importar uma vez no app (client + server).
 * Novos módulos registram-se aqui.
 */
import { registerAgencyOsModule } from "@/modules/agency-os/register-with-core";

let bootstrapped = false;

export function bootstrapOs(): void {
  if (bootstrapped) return;
  bootstrapped = true;
  registerAgencyOsModule();
  // Futuro: registerFinanceModule(), registerCrmModule(), …
}

bootstrapOs();
