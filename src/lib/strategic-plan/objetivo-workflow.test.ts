import { describe, expect, it } from "vitest";
import {
  pickObjetivoAtual,
  resolveObjetivoFase,
  shouldAutoConcluirObjetivo,
  objetivoMatchesTab,
} from "./objetivo-workflow";
import type { PlanoObjetivo } from "./types";

const base = (over: Partial<PlanoObjetivo>): PlanoObjetivo => ({
  id: "1",
  plano_id: "p",
  titulo: "Obj",
  descricao: null,
  meta_numerica: null,
  data_alvo: null,
  periodo_inicio: null,
  workflow_fase: null,
  progresso_manual: null,
  status: "pendente",
  ordem: 0,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  ...over,
});

describe("objetivo-workflow", () => {
  it("resolve em_validacao quando progresso entre 90 e 99", () => {
    expect(resolveObjetivoFase({ ...base({ status: "em_andamento" }), progressPct: 92 })).toBe(
      "em_validacao",
    );
  });

  it("pickObjetivoAtual prioriza em andamento", () => {
    const atual = pickObjetivoAtual([
      { ...base({ id: "a", status: "pendente", ordem: 0 }), progressPct: 0 },
      { ...base({ id: "b", status: "em_andamento", ordem: 1 }), progressPct: 40 },
    ]);
    expect(atual?.id).toBe("b");
  });

  it("shouldAutoConcluirObjetivo em 100%", () => {
    expect(shouldAutoConcluirObjetivo(100)).toBe(true);
    expect(shouldAutoConcluirObjetivo(99)).toBe(false);
  });

  it("objetivoMatchesTab separa histórico", () => {
    expect(objetivoMatchesTab("concluido", "concluidos")).toBe(true);
    expect(objetivoMatchesTab("em_andamento", "concluidos")).toBe(false);
  });
});
