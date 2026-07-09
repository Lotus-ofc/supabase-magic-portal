import { describe, expect, it } from "vitest";
import { discoverPilotClients, formatPilotDiscoveryTable } from "../pilot-discovery";

describe("Gate A pilot discovery CLI", () => {
  it.runIf(Boolean(process.env.GATE_A_DISCOVER))(
    "lista clientes Meta candidatos em base_metricas",
    async () => {
      const from = process.env.GATE_A_DISCOVER_FROM;
      const to = process.env.GATE_A_DISCOVER_TO;

      const candidates = await discoverPilotClients({
        from,
        to,
        minRows: Number(process.env.GATE_A_DISCOVER_MIN_ROWS ?? 100),
        limit: Number(process.env.GATE_A_DISCOVER_LIMIT ?? 20),
      });

      console.log(formatPilotDiscoveryTable(candidates));
      expect(Array.isArray(candidates)).toBe(true);
    },
    120_000,
  );
});
