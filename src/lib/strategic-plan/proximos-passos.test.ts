import { describe, expect, it } from "vitest";
import { deriveProximosPassos } from "@/lib/strategic-plan/proximos-passos";

describe("deriveProximosPassos", () => {
  it("prioriza ações pendentes e estratégias com alto peso sem conteúdo", () => {
    const passos = deriveProximosPassos({
      acoes: [
        {
          id: "a1",
          plano_id: "p1",
          estrategia_id: null,
          titulo: "Publicar 3 reels",
          descricao: null,
          motivo_estrategico: "Alcance",
          responsavel_email: null,
          data_prevista: null,
          status: "pendente",
          sugerido: false,
          ordem: 0,
          created_at: "",
          updated_at: "",
        },
      ],
      oportunidades: [],
      hipoteses: [],
      estrategias: [
        {
          id: "e1",
          plano_id: "p1",
          titulo: "Instagram Reels",
          descricao: null,
          prioridade: "alta",
          peso_percentual: 70,
          status: "em_andamento",
          responsavel_email: null,
          data_prevista: null,
          comentarios: null,
          ordem: 0,
          created_at: "",
          updated_at: "",
        },
      ],
      editorialStats: {},
      metricProgress: [],
    });

    expect(passos.some((p) => p.titulo === "Publicar 3 reels")).toBe(true);
    expect(passos.some((p) => p.titulo.includes("Instagram Reels"))).toBe(true);
    expect(passos[0]?.titulo.includes("Instagram Reels")).toBe(true);
  });
});
