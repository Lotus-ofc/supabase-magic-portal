import { describe, expect, it } from "vitest";
import { loadGateAConfig } from "../gate-a-config";
import { executeGateAParity } from "../execute-gate-a-parity";

describe("Gate A live CLI", () => {
  it.runIf(Boolean(process.env.GATE_A_CONFIG))(
    "executa validação de paridade com cliente Meta real",
    async () => {
      const configPath = process.env.GATE_A_CONFIG!;
      const config = await loadGateAConfig(configPath);

      const result = await executeGateAParity({
        config,
        onLogLine: (line) => console.log(line),
      });

      console.log(`\nRelatório: ${result.outputPaths.summaryMarkdown}`);
      console.log(`Status: ${result.gateAPassed ? "APROVADO" : "DIVERGENTE"}`);
      if (result.blockers.length > 0) {
        console.log("Bloqueadores:", result.blockers.join("; "));
      }

      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.comparison).toBeDefined();
    },
    300_000,
  );
});
