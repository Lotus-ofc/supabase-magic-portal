import { describe, expect, it } from "vitest";
import { computeHealthScore, scoreToTier } from "./compute-client-health";
import type { AgencyClientCard } from "../types";

const baseClient: AgencyClientCard = {
  id: 1,
  nome_cliente: "Test",
  slug: "test",
  ativo: true,
  empresa: null,
  valor_mensal: 1000,
  categoria: null,
  status_operacional: "ativo",
  prioridade: "B",
  proxima_acao: null,
  responsavel_user_id: null,
  ultimo_contato: new Date().toISOString(),
  proxima_reuniao: null,
  observacoes: null,
  data_inicio: null,
  avatar_url: null,
  email_principal: null,
  telefone: null,
  servicos: [],
  tags: [],
  health_tier: "excellent",
};

describe("computeHealthScore", () => {
  it("returns excellent tier for healthy active client", () => {
    const score = computeHealthScore(baseClient);
    expect(score).toBeGreaterThanOrEqual(80);
    expect(scoreToTier(score)).toBe("excellent");
  });

  it("returns critical tier when client is inactive", () => {
    const score = computeHealthScore({ ...baseClient, ativo: false });
    expect(scoreToTier(score)).toBe("critical");
  });

  it("penalizes attention status", () => {
    const score = computeHealthScore({ ...baseClient, status_operacional: "atencao" });
    expect(score).toBeLessThan(80);
  });
});
