import { describe, expect, it } from "vitest";
import {
  isHardDeleteForbidden,
  isLibraryStatus,
  mapLegacyPostStatus,
  mapLegacyRevisionTipo,
} from "./migration-helpers";

describe("migration-helpers", () => {
  it("maps legacy post statuses", () => {
    expect(mapLegacyPostStatus("rascunho")).toBe("producao");
    expect(mapLegacyPostStatus("em_producao")).toBe("producao");
    expect(mapLegacyPostStatus("aguardando_aprovacao")).toBe("aguardando_aprovacao");
    expect(mapLegacyPostStatus("publicado")).toBe("publicado");
    expect(mapLegacyPostStatus("unknown")).toBe("producao");
  });

  it("maps legacy revision tipos", () => {
    expect(mapLegacyRevisionTipo("comentario")).toBe("commented");
    expect(mapLegacyRevisionTipo("aprovacao")).toBe("approved");
    expect(mapLegacyRevisionTipo("reprovacao")).toBe("rejected");
    expect(mapLegacyRevisionTipo("mudanca_status")).toBe("moved");
  });

  it("identifies library statuses", () => {
    expect(isLibraryStatus("publicado")).toBe(true);
    expect(isLibraryStatus("arquivado")).toBe(true);
    expect(isLibraryStatus("producao")).toBe(false);
  });

  it("forbids hard delete for published/archived", () => {
    expect(isHardDeleteForbidden("publicado")).toBe(true);
    expect(isHardDeleteForbidden("arquivado")).toBe(true);
    expect(isHardDeleteForbidden("producao")).toBe(false);
  });
});
