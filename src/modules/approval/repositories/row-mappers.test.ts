import { describe, expect, it } from "vitest";
import {
  mapContentCardAttachmentRow,
  mapContentCardEventRow,
  mapContentCardRow,
  mapEditorialPillarRow,
  mapStoryPlanRowRow,
} from "./row-mappers";

describe("row-mappers", () => {
  it("maps content_cards row to domain", () => {
    const card = mapContentCardRow({
      id: "11111111-1111-1111-1111-111111111111",
      cadastro_cliente_id: 42,
      cliente_nome: "Acme",
      data_publicacao: "2026-07-01",
      hora_publicacao: "10:00:00",
      titulo: "Post",
      legenda: null,
      copy_text: null,
      roteiro: null,
      direcao_arte: null,
      cta: null,
      plataforma: "instagram",
      formato: null,
      capa_url: null,
      status: "producao",
      checklist: [{ id: "22222222-2222-2222-2222-222222222222", label: "CTA", done: false }],
      localizacao: null,
      tags: ["tag1"],
      observacoes: null,
      responsavel_email: null,
      responsavel_user_id: null,
      pilar_id: null,
      estrategia_id: null,
      kanban_ordem: 3,
      published_at: null,
      archived_at: null,
      ai_metadata: { model: "gpt" },
      integration_metadata: {},
      legacy_post_id: null,
      created_by: null,
      created_at: "2026-07-01T00:00:00Z",
      updated_at: "2026-07-01T00:00:00Z",
    });
    expect(card.cadastro_cliente_id).toBe(42);
    expect(card.kanban_ordem).toBe(3);
    expect(card.checklist).toHaveLength(1);
    expect(card.ai_metadata).toEqual({ model: "gpt" });
  });

  it("maps event row", () => {
    const event = mapContentCardEventRow({
      id: "e1",
      card_id: "c1",
      actor_id: null,
      actor_email: "a@test.com",
      event_type: "commented",
      payload: { mensagem: "ok" },
      created_at: "2026-07-01T00:00:00Z",
    });
    expect(event.event_type).toBe("commented");
    expect(event.payload.mensagem).toBe("ok");
  });

  it("maps attachment, pillar and story rows", () => {
    const attachment = mapContentCardAttachmentRow({
      id: "a1",
      card_id: "c1",
      storage_path: "path/file.jpg",
      mime_type: "image/jpeg",
      kind: "image",
      media_role: "preview",
      file_name: "file.jpg",
      file_size: 100,
      ordem: 0,
      width: 100,
      height: 200,
      duration_seconds: null,
      poster_path: null,
      legacy_media_id: null,
      created_at: "2026-07-01T00:00:00Z",
    });
    expect(attachment.kind).toBe("image");

    const pillar = mapEditorialPillarRow({
      id: "p1",
      cadastro_cliente_id: 1,
      titulo: "Pilar",
      objetivo: null,
      explicacao: null,
      cor: "#fff",
      ordem: 1,
      ativo: true,
      created_at: "2026-07-01T00:00:00Z",
      updated_at: "2026-07-01T00:00:00Z",
    });
    expect(pillar.titulo).toBe("Pilar");

    const story = mapStoryPlanRowRow({
      id: "s1",
      cadastro_cliente_id: 1,
      card_id: null,
      semana_inicio: "2026-07-07",
      dia_semana: 1,
      periodo: "manha",
      titulo: "Story",
      observacoes: null,
      checklist: [],
      ordem: 0,
      created_by: null,
      created_at: "2026-07-01T00:00:00Z",
      updated_at: "2026-07-01T00:00:00Z",
    });
    expect(story.dia_semana).toBe(1);
  });
});
