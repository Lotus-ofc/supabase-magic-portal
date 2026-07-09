import { InMemoryHealthSignalStore } from "./signal-store/in-memory-health-signal-store";
import { InMemoryHealthRepository } from "./repositories/in-memory-health.repository";
import { HealthEngine } from "./health-engine";
import { defaultHealthEvaluators } from "./evaluators/default-evaluators";
import { ManualReconciliationScheduler } from "./reconciliation-scheduler";

/** Factory Fase 5 — Health observável sem Runtime. */
export function createHealthStack() {
  const signalStore = new InMemoryHealthSignalStore();
  const healthRepository = new InMemoryHealthRepository();
  const healthEngine = new HealthEngine(signalStore, healthRepository, defaultHealthEvaluators);
  const reconciliationScheduler = new ManualReconciliationScheduler(healthEngine);

  return {
    signalStore,
    healthRepository,
    healthEngine,
    reconciliationScheduler,
  };
}
