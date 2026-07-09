export type {
  GateAConfigV1,
  GateAParityRunResultV1,
  GateACoverageV1,
  GateADivergenceSummaryV1,
  GateAStepLogV1,
} from "./types";
export { GATE_A_CORE_METRICS } from "./types";

export { loadGateAConfig, validateGateAConfig, applyGateAEnvOverrides } from "./gate-a-config";
export { createGateAHubStack } from "./create-gate-a-hub";
export { executeGateAParity } from "./execute-gate-a-parity";
export type { ExecuteGateAParityOptions } from "./execute-gate-a-parity";

export { discoverPilotClients, formatPilotDiscoveryTable } from "./pilot-discovery";
export type { PilotClientCandidateV1, DiscoverPilotClientsOptions } from "./pilot-discovery";

export { exportGateAReport } from "./report/export-gate-a-report";
export { formatGateASummaryMarkdown } from "./report/format-summary";
export {
  buildGateACoverage,
  buildDivergenceSummary,
  evaluateGateABlockers,
} from "./report/divergence-diagnostics";

export { createGateALogger } from "./logging/gate-a-logger";
